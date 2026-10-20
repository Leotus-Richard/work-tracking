import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {validate,analyze,exportGraph,stable} from './work-graph.mjs';

const graph=JSON.parse(fs.readFileSync(fileURLToPath(new URL('../assets/example-work-graph.json',import.meta.url)),'utf8'));
const configs=JSON.parse(fs.readFileSync(fileURLToPath(new URL('../assets/example-tracker-configs.json',import.meta.url)),'utf8'));
const clone=x=>structuredClone(x), cases=[];
function test(name,fn) { fn(); cases.push({case:name,passed:true}); }
function snapshotFor(g,c) {
  const exp=exportGraph(g,c), snapshot={graphId:g.id,platform:c.platform,asOf:'synthetic-test',items:{},edges:{}};
  let i=10;
  for (const n of g.items) {
    const desiredHash=exp.desiredSnapshot.items[n.id].desiredHash;
    const binding=c.platform==='github'?{id:10000+i,number:i,labels:['unrelated-label']}:
      c.platform==='jira'?{key:'TEST-'+i}:c.platform==='azure-devops'?{id:i,rev:1}:{id:'TEST-UUID-'+i};
    snapshot.items[n.id]={binding,baseHash:desiredHash,observedHash:desiredHash}; i++;
  }
  for (const e of g.edges) {
    const desiredHash=exp.desiredSnapshot.edges[e.id].desiredHash;
    snapshot.edges[e.id]={baseHash:desiredHash,observedHash:desiredHash};
  }
  return snapshot;
}
test('valid-contract',()=>assert.equal(validate(graph).valid,true));
test('independent-frontier-and-full-join',()=>{
  const a=analyze(graph);
  assert.deepEqual(a.runnable,['T-1','T-2']);
  assert(a.blocked.some(n=>n.id==='A-1' && n.reasons.length===2));
});
test('hierarchy-and-schedule-do-not-create-blockers',()=>{
  const g=clone(graph); g.edges=g.edges.filter(e=>e.type!=='contains'); g.scheduleConstraints=[];
  assert.deepEqual(analyze(g).runnable,analyze(graph).runnable);
});
test('false-edge-rejected',()=>{
  const g=clone(graph); g.edges.find(e=>e.id==='E-1').carries=['made-up'];
  assert.equal(validate(g).valid,false);
});
test('cycle-rejected',()=>{
  const g=clone(graph); g.edges.push({id:'cycle',from:'T-3',to:'D-1',type:'blocks',contract:'data',carries:['verified-rollout'],reason:'bad cycle'});
  g.items.find(n=>n.id==='D-1').inputs=['verified-rollout'];
  assert(validate(g).errors.includes('Cycle in blocks graph'));
});
test('cancelled-does-not-unblock',()=>{
  const g=clone(graph); g.items.find(n=>n.id==='D-1').state='cancelled';
  assert.equal(analyze(g).runnable.length,0);
});
test('done-requires-output-evidence',()=>{
  const g=clone(graph); g.items.find(n=>n.id==='T-1').state='done';
  assert.equal(validate(g).valid,false);
});
test('done-cannot-bypass-unmet-join',()=>{
  const g=clone(graph),a=g.items.find(n=>n.id==='A-1');
  a.state='done';a.completionEvidence=[{token:'rollout-authority',reference:'synthetic-approval'}];
  assert(validate(g).errors.some(e=>e.startsWith('Done item has unmet prerequisite')));
});
test('duplicate-native-relationship-rejected-before-export',()=>{
  const g=clone(graph);g.edges.push({...g.edges.find(e=>e.id==='E-1'),id:'duplicate'});
  assert(validate(g).errors.some(e=>e.startsWith('Duplicate semantic relationship')));
});
test('authority-origin-enforced',()=>{
  const g=clone(graph); g.edges.find(e=>e.id==='E-5').contract='data';
  assert.equal(validate(g).valid,true);
  g.edges.find(e=>e.id==='E-3').contract='authority';
  assert.equal(validate(g).valid,false);
});
test('unknown-estimates-no-date-forecast',()=>assert(analyze(graph).scheduleStatus.includes('no capacity')));
test('duplicate-ids-and-invalid-state-rejected',()=>{
  const g=clone(graph); g.items.push(clone(g.items[0])); assert.equal(validate(g).valid,false);
  g.items.pop(); g.items[0].state='blocked'; assert.equal(validate(g).valid,false);
});
test('missing-external-input-is-local-block',()=>{
  const g=clone(graph); g.items.find(n=>n.id==='T-1').inputs.push('missing');
  const a=analyze(g); assert.deepEqual(a.runnable,['T-2']);
  assert(a.blocked.find(n=>n.id==='T-1').reasons.some(x=>x.reason==='missing-external-input-evidence'));
});
for (const platform of ['github','azure-devops','linear','jira']) {
  test(platform+'-deterministic-offline-export',()=>{
    const c=configs[platform];
    const a=exportGraph(graph,c);
    assert.equal(stable(a),stable(exportGraph(graph,c)));
    assert.equal(a.mode,'offline-review-only');
    assert.equal(a.operations.filter(o=>o.action==='create').length,graph.items.length);
  });
  test(platform+'-snapshot-noop-and-conflict',()=>{
    const c=configs[platform], s=snapshotFor(graph,c);
    assert.equal(exportGraph(graph,c,s).operations.length,0);
    s.items['T-1'].observedHash='remote-change';
    const exp=exportGraph(graph,c,s);
    assert(exp.conflicts.some(x=>x.id==='T-1'));
    assert(!exp.operations.some(x=>x.canonicalId==='T-1'));
  });
  test(platform+'-changed-item-has-reviewable-update',()=>{
    const c=configs[platform], s=snapshotFor(graph,c), g=clone(graph);
    g.items.find(n=>n.id==='T-1').title+=' UPDATED';
    const exp=exportGraph(g,c,s);
    assert(exp.operations.some(x=>x.canonicalId==='T-1' && x.action==='update'));
  });
}
test('github-direction-global-id-not-number',()=>{
  const c=configs.github, s=snapshotFor(graph,c); delete s.edges['E-1'];
  const r=exportGraph(graph,c,s).operations.find(o=>o.canonicalId==='E-1').requests[0];
  assert(r.url.includes('/issues/'+s.items['T-1'].binding.number+'/dependencies/blocked_by'));
  assert.equal(r.body.issue_id,s.items['D-1'].binding.id);
  assert.notEqual(r.body.issue_id,s.items['D-1'].binding.number);
});
test('github-subissue-body-and-safe-label-preservation',()=>{
  const c=configs.github,s=snapshotFor(graph,c);delete s.edges['H-1'];
  const exp=exportGraph(graph,c,s);
  const r=exp.operations.find(o=>o.canonicalId==='H-1').requests[0];
  assert.equal(r.body.sub_issue_id,s.items['T-1'].binding.id);
  const g=clone(graph);g.items.find(n=>n.id==='T-1').title+=' edit';
  const u=exportGraph(g,c,s).operations.find(o=>o.canonicalId==='T-1').requests[0];
  assert(u.body.labels.includes('unrelated-label'));
});
test('azure-forward-successor-and-revision-guard',()=>{
  const c=configs['azure-devops'],s=snapshotFor(graph,c);delete s.edges['E-1'];
  const r=exportGraph(graph,c,s).operations.find(o=>o.canonicalId==='E-1').requests[0];
  assert.equal(r.body[0].path,'/rev');
  assert.equal(r.body[1].value.rel,'System.LinkTypes.Dependency-Forward');
  assert(r.body[1].value.url.endsWith('/'+s.items['T-1'].binding.id));
});
test('linear-source-blocks-target',()=>{
  const c=configs.linear,s=snapshotFor(graph,c);delete s.edges['E-1'];
  const input=exportGraph(graph,c,s).operations.find(o=>o.canonicalId==='E-1').requests[0].body.variables.input;
  assert.deepEqual(input,{issueId:s.items['D-1'].binding.id,relatedIssueId:s.items['T-1'].binding.id,type:'blocks'});
});
test('jira-unverified-blocks-fail-closed-and-configured-direction',()=>{
  const c=clone(configs.jira),s=snapshotFor(graph,c);delete s.edges['E-1'];
  assert(exportGraph(graph,c,s).unsupported.some(x=>x.id==='E-1'));
  c.blockLink.verified=true;
  const r=exportGraph(graph,c,s).operations.find(o=>o.canonicalId==='E-1').requests[0];
  assert.equal(r.body.inwardIssue.key,s.items['D-1'].binding.key);
  assert.equal(r.body.outwardIssue.key,s.items['T-1'].binding.key);
  c.blockLink.sourceEnd='outwardIssue';
  assert.equal(exportGraph(graph,c,s).operations.find(o=>o.canonicalId==='E-1').requests[0].body.outwardIssue.key,s.items['D-1'].binding.key);
});
test('jira-status-is-not-guessed-transition',()=>{
  const exp=exportGraph(graph,configs.jira);
  const r=exp.operations.find(o=>o.canonicalId==='T-1').requests[1];
  assert.equal(r.kind,'resolve-transition');
  assert.equal(r.desiredStatusId,configs.jira.states.ready);
});
test('new-relationships-wait-for-native-ids',()=>{
  assert(exportGraph(graph,configs.linear).deferred.some(x=>x.reason==='native-ids-required'));
});
test('binding-without-baseline-is-conflict',()=>{
  const c=clone(configs.github);c.bindings['T-1']={id:42,number:5};
  assert(exportGraph(graph,c).conflicts.some(x=>x.id==='T-1'));
});
test('missing-mapping-rejected',()=>{
  const c=clone(configs.linear);delete c.states.ready;
  assert.throws(()=>exportGraph(graph,c),/Missing verified tracker mapping/);
});
test('snapshot-mismatch-rejected',()=>assert.throws(()=>exportGraph(graph,configs.github,{platform:'jira'}),/mismatch/));
test('removed-record-never-deleted',()=>{
  const s=snapshotFor(graph,configs.github);s.items['REMOVED']={binding:{id:99,number:99}};
  assert(exportGraph(graph,configs.github,s).conflicts.some(x=>x.id==='REMOVED'));
});
console.log(JSON.stringify({passed:true,cases,networkCalls:0,liveTrackerTests:false},null,2));
