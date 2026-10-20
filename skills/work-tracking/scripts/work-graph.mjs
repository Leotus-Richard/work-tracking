import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const states = new Set(['backlog', 'ready', 'in_progress', 'done', 'cancelled']);
const kinds = new Set(['program','project','requirement','decision','task','milestone','risk','issue','approval']);
const policies = new Set(['RETRY','FALLBACK','SKIP','REPAIR','ESCALATE','STOP']);
const types = new Set(['blocks','contains','relates_to','informs']);
const array = x => Array.isArray(x) ? x : [];
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
export function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object')
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+stable(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export const hash = value => crypto.createHash('sha256').update(stable(value)).digest('hex');
const sort = xs => [...xs].sort((a,b) => a.id.localeCompare(b.id));
function waves(items, edges) {
  const pending = new Set(items.map(x => x.id)), result = [];
  while (pending.size) {
    const batch = [...pending].filter(id => !edges.some(e => e.to === id && pending.has(e.from))).sort();
    if (!batch.length) return {waves:result, cyclic:[...pending].sort()};
    result.push(batch);
    batch.forEach(id => pending.delete(id));
  }
  return {waves:result, cyclic:[]};
}
export function validate(g) {
  const errors = [];
  if (!g || typeof g !== 'object') return {valid:false,errors:['Graph must be an object']};
  if (g.schemaVersion !== 1 || !nonempty(g.id)) errors.push('schemaVersion must be 1 and id must be nonempty');
  if (!Array.isArray(g.items) || !Array.isArray(g.edges)) errors.push('items and edges must be arrays');
  const items = array(g.items), edges = array(g.edges), byId = new Map();
  for (const n of items) {
    if (!n || typeof n !== 'object') { errors.push('Invalid item'); continue; }
    if (!nonempty(n.id) || byId.has(n.id)) errors.push(`Duplicate or missing item id: ${n.id}`);
    byId.set(n.id,n);
    if (!nonempty(n.title) || !kinds.has(n.kind) || !states.has(n.state)) errors.push(`Invalid title/kind/state: ${n.id}`);
    if (!Object.hasOwn(n,'owner') || !(n.owner === null || nonempty(n.owner))) errors.push(`Explicit owner or null required: ${n.id}`);
    for (const key of ['inputs','outputs','acceptance','completionEvidence','externalInputEvidence'])
      if (!Array.isArray(n[key])) errors.push(`${n.id}.${key} must be an array`);
    for (const key of ['inputs','outputs','acceptance']) {
      const values = array(n[key]);
      if (values.some(v => !nonempty(v)) || new Set(values).size !== values.length) errors.push(`Invalid or repeated ${key}: ${n.id}`);
    }
    if (!array(n.acceptance).length) errors.push(`Acceptance checks required: ${n.id}`);
    if (!policies.has(n.failurePolicy)) errors.push(`Invalid failurePolicy: ${n.id}`);
    for (const key of ['completionEvidence','externalInputEvidence'])
      if (array(n[key]).some(e => !e || !nonempty(e.token) || !nonempty(e.reference)))
        errors.push(`Evidence requires token and reference: ${n.id}.${key}`);
    if (n.state === 'done') {
      if (!array(n.completionEvidence).length) errors.push(`Done requires completion evidence: ${n.id}`);
      for (const token of array(n.outputs))
        if (!array(n.completionEvidence).some(e => e.token === token)) errors.push(`Missing output evidence: ${n.id}/${token}`);
    }
    if (n.estimate != null && (!Number.isFinite(n.estimate.value) || n.estimate.value < 0 ||
        !nonempty(n.estimate.unit) || !nonempty(n.estimate.source)))
      errors.push(`Estimate requires finite nonnegative value, unit and source: ${n.id}`);
  }
  const edgeIds = new Set(), parents = new Set(), relationships = new Set();
  for (const e of edges) {
    if (!e || typeof e !== 'object') { errors.push('Invalid edge'); continue; }
    if (!nonempty(e.id) || edgeIds.has(e.id)) errors.push(`Duplicate or missing edge id: ${e.id}`);
    edgeIds.add(e.id);
    const identity=stable([e.type,e.from,e.to]);
    if (relationships.has(identity)) errors.push(`Duplicate semantic relationship: ${e.id}`);
    relationships.add(identity);
    if (!types.has(e.type) || !byId.has(e.from) || !byId.has(e.to) || e.from === e.to)
      errors.push(`Invalid edge endpoints/type: ${e.id}`);
    if (!nonempty(e.reason)) errors.push(`Edge reason required: ${e.id}`);
    if (e.type === 'contains') {
      if (parents.has(e.to)) errors.push(`Multiple parents: ${e.to}`);
      parents.add(e.to);
    }
    if (e.type === 'blocks') {
      if (!['data','authority'].includes(e.contract)) errors.push(`Blocker requires data or authority contract: ${e.id}`);
      if (!array(e.carries).length || array(e.carries).some(t => !nonempty(t)) ||
          new Set(array(e.carries)).size!==array(e.carries).length) errors.push(`Blocker requires unique tokens: ${e.id}`);
      for (const token of array(e.carries)) {
        if (!array(byId.get(e.from)?.outputs).includes(token) || !array(byId.get(e.to)?.inputs).includes(token))
          errors.push(`False dependency, token not produced and consumed: ${e.id}/${token}`);
      }
      if (e.contract === 'authority' && byId.get(e.from)?.kind !== 'approval')
        errors.push(`Authority must originate at an approval: ${e.id}`);
    }
  }
  for (const n of items.filter(n=>n?.state==='done')) {
    const incoming=edges.filter(e=>e?.type==='blocks' && e.to===n.id);
    for (const e of incoming)
      if (byId.get(e.from)?.state!=='done') errors.push(`Done item has unmet prerequisite: ${n.id}/${e.id}`);
    for (const token of array(n.inputs))
      if (!incoming.some(e=>array(e.carries).includes(token)) &&
          !array(n.externalInputEvidence).some(e=>e?.token===token))
        errors.push(`Done item has unproven input: ${n.id}/${token}`);
  }
  for (const type of ['blocks','contains']) {
    if (waves(items.filter(Boolean),edges.filter(e => e?.type === type)).cyclic.length) errors.push(`Cycle in ${type} graph`);
  }
  for (const s of array(g.scheduleConstraints)) {
    if (!s || !byId.has(s.from) || !byId.has(s.to) || s.from === s.to ||
        !['FS','SS','FF','SF'].includes(s.type) || !Number.isFinite(s.lag) || !nonempty(s.unit))
      errors.push('Invalid schedule constraint');
  }
  return {valid:!errors.length,errors};
}
export function analyze(g) {
  const check = validate(g);
  if (!check.valid) throw new Error(check.errors.join('\n'));
  const byId = new Map(g.items.map(n=>[n.id,n])), blocked = [], runnable = [], ongoing = [];
  for (const n of sort(g.items)) {
    if (['done','cancelled'].includes(n.state)) continue;
    const reasons = [];
    const incoming = g.edges.filter(e => e.type === 'blocks' && e.to === n.id);
    for (const e of incoming) {
      const source = byId.get(e.from);
      if (source.state !== 'done') reasons.push({edge:e.id,source:e.from,reason:`prerequisite-${source.state}`});
    }
    for (const token of n.inputs) {
      if (!incoming.some(e => e.carries.includes(token)) &&
          !n.externalInputEvidence.some(e => e.token === token))
        reasons.push({token,reason:'missing-external-input-evidence'});
    }
    if (reasons.length) blocked.push({id:n.id,reasons});
    else if (n.state === 'ready') runnable.push(n.id);
    else if (n.state === 'in_progress') ongoing.push(n.id);
  }
  return {graphId:g.id,asOf:g.asOf ?? null,runnable,ongoing,blocked,
    structuralWaves:waves(g.items,g.edges.filter(e=>e.type === 'blocks')).waves,
    scheduleStatus:'Structural dependency analysis only; no capacity, critical-path duration or date forecast.'};
}
const escapeHTML = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const adf = text => ({type:'doc',version:1,content:[{type:'paragraph',content:[{type:'text',text}]}]});
export function body(n,g) {
  return `[work-graph:${g.id}/${n.id}]\nCanonical state: ${n.state}\nKind: ${n.kind}\nOwner: ${n.owner ?? 'unknown'}\n`+
    `${n.description ?? ''}\n\nAcceptance:\n${n.acceptance.map(a=>'- '+a).join('\n')}\n\n`+
    `Inputs: ${n.inputs.join(', ') || 'none'}\nOutputs: ${n.outputs.join(', ') || 'none'}\nFailure: ${n.failurePolicy}\n`+
    `Traceability: ${stable(n.traceability ?? {})}\nEstimate: ${stable(n.estimate ?? null)}\nEvidence: ${stable(n.completionEvidence)}\nExternal input evidence: ${stable(n.externalInputEvidence)}\n`+
    `Relationships: ${stable(g.edges.filter(e=>e.from===n.id || e.to===n.id))}\n`+
    `Schedule constraints (not blocking edges): ${stable(array(g.scheduleConstraints).filter(e=>e.from===n.id || e.to===n.id))}`;
}
function required(value, label) {
  if (!nonempty(value)) throw new Error(`Missing verified tracker mapping: ${label}`);
  return value;
}
function request(method,url,payload,contentType='application/json') {
  return {method,url,contentType,body:payload};
}
const enc = encodeURIComponent;
const gql = (url,query,variables) => request('POST',url,{query,variables});
function itemRequests(n,g,c,b,mode) {
  const text=body(n,g), state=required(c.states?.[n.state],`states.${n.state}`);
  if (c.platform === 'github') {
    const base=`https://api.github.com/repos/${enc(required(c.owner,'owner'))}/${enc(required(c.repo,'repo'))}/issues`;
    const stateLabel=state;
    const managed=new Set([...Object.values(c.states ?? {}),...Object.values(c.kinds ?? {})]);
    if (mode==='update' && !Array.isArray(b.labels)) throw new Error(`Current GitHub labels required for safe update: ${n.id}`);
    const labels=[...new Set([...(mode==='update'?b.labels.filter(l=>!managed.has(l)):[]),
      stateLabel,required(c.kinds?.[n.kind],`kinds.${n.kind}`)])];
    return [request(mode==='create'?'POST':'PATCH',mode==='create'?base:`${base}/${b.number}`,
      {title:n.title,body:text,labels,...(mode==='update'?{state:['done','cancelled'].includes(n.state)?'closed':'open'}:{})}),
      ...(mode==='create' && ['done','cancelled'].includes(n.state)?
        [request('PATCH',`${base}/{{${n.id}.number}}`,{state:'closed'})]:[])];
  }
  if (c.platform === 'azure-devops') {
    const prefix=`https://dev.azure.com/${enc(required(c.organization,'organization'))}/${enc(required(c.project,'project'))}/_apis/wit/workitems/`;
    const type=required(c.kinds?.[n.kind],`kinds.${n.kind}`);
    const patch=[{op:'add',path:'/fields/System.Title',value:n.title},
      {op:'add',path:'/fields/System.Description',value:`<pre>${escapeHTML(text)}</pre>`},
      {op:'add',path:'/fields/System.State',value:state}];
    if (mode==='update' && b.rev != null) patch.unshift({op:'test',path:'/rev',value:b.rev});
    return [request(mode==='create'?'POST':'PATCH',`${prefix}${mode==='create'?'$'+enc(type):b.id}?api-version=7.1`,patch,'application/json-patch+json')];
  }
  if (c.platform === 'linear') {
    const input={title:n.title,description:text,stateId:state};
    const url=c.apiUrl ?? 'https://api.linear.app/graphql';
    if (mode==='create') {
      input.teamId=required(c.teamId,'teamId');
      if (c.projectId) input.projectId=c.projectId;
      return [gql(url,'mutation($input:IssueCreateInput!){issueCreate(input:$input){success issue{id identifier}}}',{input})];
    }
    return [gql(url,'mutation($id:String!,$input:IssueUpdateInput!){issueUpdate(id:$id,input:$input){success issue{id identifier}}}',{id:b.id,input})];
  }
  if (c.platform === 'jira') {
    const base=required(c.baseUrl,'baseUrl').replace(/\/$/,'');
    const fields={summary:n.title,description:adf(text)};
    if (mode==='create') {
      fields.project={key:required(c.projectKey,'projectKey')};
      fields.issuetype={id:required(c.kinds?.[n.kind],`kinds.${n.kind}`)};
    }
    const target=mode==='create'?'{{'+n.id+'.key}}':b.key;
    // Transition IDs are origin-state-specific. The configured value is a desired status ID,
    // not permission to assume a universally valid transition.
    return [request(mode==='create'?'POST':'PUT',`${base}/rest/api/3/issue${mode==='create'?'':'/'+enc(b.key)}`,{fields}),
      {kind:'resolve-transition',issue:target,desiredStatusId:state,
        discovery:request('GET',`${base}/rest/api/3/issue/${target}/transitions`,null),
        requirement:'Select a currently permitted transition whose destination is desiredStatusId; review before sending.'}];
  }
  throw new Error(`Unsupported tracker: ${c.platform}`);
}
const bindingFields={github:['number','id'],'azure-devops':['id'],linear:['id'],jira:['key']};
function relationshipRequest(e,c,source,target) {
  if (c.platform==='github') {
    const root=`https://api.github.com/repos/${enc(c.owner)}/${enc(c.repo)}/issues`;
    if (e.type==='blocks') return request('POST',`${root}/${target.number}/dependencies/blocked_by`,{issue_id:source.id});
    if (e.type==='contains') return request('POST',`${root}/${source.number}/sub_issues`,{sub_issue_id:target.id});
  }
  if (c.platform==='azure-devops' && ['blocks','contains'].includes(e.type)) {
    const root=`https://dev.azure.com/${enc(c.organization)}/${enc(c.project)}/_apis/wit/workitems`;
    const rel=e.type==='blocks'?'System.LinkTypes.Dependency-Forward':'System.LinkTypes.Hierarchy-Forward';
    const patch=[...(source.rev != null?[{op:'test',path:'/rev',value:source.rev}]:[]),
      {op:'add',path:'/relations/-',value:{rel,url:`${root}/${target.id}`,attributes:{comment:e.reason}}}];
    return request('PATCH',`${root}/${source.id}?api-version=7.1`,patch,'application/json-patch+json');
  }
  if (c.platform==='linear') {
    const url=c.apiUrl ?? 'https://api.linear.app/graphql';
    if (e.type==='contains') return gql(url,'mutation($id:String!,$input:IssueUpdateInput!){issueUpdate(id:$id,input:$input){success issue{id}}}',{id:target.id,input:{parentId:source.id}});
    if (['blocks','relates_to'].includes(e.type))
      return gql(url,'mutation($input:IssueRelationCreateInput!){issueRelationCreate(input:$input){success issueRelation{id}}}',
        {input:{issueId:source.id,relatedIssueId:target.id,type:e.type==='blocks'?'blocks':'related'}});
  }
  if (c.platform==='jira' && e.type==='blocks') {
    const mapping=c.blockLink;
    if (!mapping?.verified || !['inwardIssue','outwardIssue'].includes(mapping.sourceEnd) || !nonempty(mapping.typeName))
      return null;
    const other=mapping.sourceEnd==='inwardIssue'?'outwardIssue':'inwardIssue';
    return request('POST',`${c.baseUrl.replace(/\/$/,'')}/rest/api/3/issueLink`,
      {type:{name:mapping.typeName},[mapping.sourceEnd]:{key:source.key},[other]:{key:target.key}});
  }
  return null;
}
export function exportGraph(g,c,snapshot=null) {
  const check=validate(g);
  if (!check.valid) throw new Error(check.errors.join('\n'));
  if (!bindingFields[c.platform]) throw new Error(`Unsupported tracker: ${c.platform}`);
  if (snapshot && (snapshot.graphId!==g.id || snapshot.platform!==c.platform || !snapshot.asOf))
    throw new Error('Snapshot graph/platform/asOf mismatch');
  const bindings={},operations=[],conflicts=[],deferred=[],unsupported=[],noops=[];
  const desiredSnapshot={graphId:g.id,platform:c.platform,asOf:null,items:{},edges:{}};
  const configuration={...c};delete configuration.bindings;
  for (const n of sort(g.items)) {
    const entry=snapshot?.items?.[n.id], b=entry?.binding ?? c.bindings?.[n.id], h=hash({item:n,body:body(n,g),configuration});
    desiredSnapshot.items[n.id]={desiredHash:h};
    if (b) {
      for (const key of bindingFields[c.platform]) {
        if (b[key]==null || b[key]==='') throw new Error(`Missing native binding ${n.id}.${key}`);
        if (['github','azure-devops'].includes(c.platform) && ['number','id'].includes(key) &&
            (!Number.isInteger(b[key]) || b[key]<=0)) throw new Error(`Native binding must be positive integer: ${n.id}.${key}`);
      }
      bindings[n.id]=b;
      if (!entry?.baseHash || !entry?.observedHash) {
        conflicts.push({id:n.id,reason:'existing-binding-without-reviewed-baseline'}); continue;
      }
      if (entry.baseHash!==entry.observedHash) {conflicts.push({id:n.id,reason:'remote-change-since-baseline'});continue;}
      if (h===entry.observedHash) {noops.push(n.id);continue;}
    } else {
      bindings[n.id]=Object.fromEntries(bindingFields[c.platform].map(key=>[key,`{{${n.id}.${key}}}`]));
    }
    const mode=b?'update':'create';
    operations.push({id:hash({graph:g.id,platform:c.platform,item:n.id,h,mode}),phase:1,canonicalId:n.id,action:mode,
      desiredHash:h,reviewRequired:true,preconditions:b?['Re-read remote record and compare to supplied snapshot before write.']:
        ['Search stable work-graph marker and reconcile before create; operation IDs are not provider idempotency keys.'],
      requests:itemRequests(n,g,c,bindings[n.id],mode)});
  }
  const conflicted=new Set(conflicts.map(x=>x.id));
  for (const e of sort(g.edges)) {
    const h=hash({edge:e,configuration}); desiredSnapshot.edges[e.id]={desiredHash:h};
    if (conflicted.has(e.from)||conflicted.has(e.to)) {deferred.push({id:e.id,reason:'endpoint-conflict'});continue;}
    const old=snapshot?.edges?.[e.id];
    if (old && (!old.baseHash || !old.observedHash || old.baseHash!==old.observedHash)) {
      conflicts.push({id:e.id,reason:'relationship-baseline-conflict'});continue;
    }
    if (old?.observedHash===h) {noops.push(e.id);continue;}
    const r=relationshipRequest(e,c,bindings[e.from],bindings[e.to]);
    if (!r) {unsupported.push({id:e.id,type:e.type,reason:'No verified native mapping; canonical graph/body preserve semantics. Do not substitute a related link for a blocker.'});continue;}
    if (old) {conflicts.push({id:e.id,reason:'changed-relationship-requires-reviewed-remove-and-add'});continue;}
    const unresolved=[e.from,e.to].filter(id=>bindingFields[c.platform].some(key=>String(bindings[id][key]).includes('{{')));
    if (unresolved.length) deferred.push({id:e.id,reason:'native-ids-required',canonicalIds:unresolved});
    operations.push({id:hash({graph:g.id,platform:c.platform,edge:e.id,h}),phase:2,canonicalId:e.id,
      action:'add-relationship',desiredHash:h,reviewRequired:true,
      preconditions:['Resolve native IDs after successful item reconciliation; inspect existing links before add.'],requests:[r]});
  }
  const removedItems=Object.keys(snapshot?.items ?? {}).filter(id=>!g.items.some(n=>n.id===id));
  const removedEdges=Object.keys(snapshot?.edges ?? {}).filter(id=>!g.edges.some(e=>e.id===id));
  for (const id of [...removedItems,...removedEdges]) conflicts.push({id,reason:'deletion-not-automatic'});
  return {schemaVersion:1,mode:'offline-review-only',graphId:g.id,platform:c.platform,sourceHash:hash(g),
    snapshotAsOf:snapshot?.asOf ?? null,operations,noops,conflicts,deferred,unsupported,desiredSnapshot,
    authority:'No operation was sent or applied. desiredSnapshot is a proposal, not an observed tracker snapshot.',
    limitations:['No HTTP executor, credentials or live validation.','Owner and estimate native fields require separate verified mappings; retained in canonical records.',
      'Jira transitions require per-issue discovery. Hierarchy support differs; unsupported relations remain canonical.',
      'No automatic deletion, dependency removal, schedule engine or bidirectional field import.']};
}
export function main(args) {
  const [command,file,config,snapshot]=args;
  if (!['validate','analyze','export'].includes(command) || !file || (command==='export' && !config))
    throw new Error('Usage: node work-graph.mjs validate|analyze GRAPH; or export GRAPH CONFIG [SNAPSHOT]');
  const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
  const graph=read(file);
  const result=command==='validate'?validate(graph):command==='analyze'?analyze(graph):exportGraph(graph,read(config),snapshot?read(snapshot):null);
  console.log(JSON.stringify(result,null,2));
  if (command==='validate' && !result.valid) process.exitCode=1;
}
if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {main(process.argv.slice(2));}
  catch(e) {console.error(e.message);process.exitCode=1;}
}
