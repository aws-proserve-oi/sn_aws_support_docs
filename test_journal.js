gr = new GlideRecord('sys_journal_field');
gr.addQuery('element_id', '965c9e5347c12200e0ef563dbb9a7156');
gr.query();
while (gr.hasNext()) {
  gr.next();
  gs.log(gr.sys_created_by + " " + gr.element);
}


gr = new GlideRecord('incident');
gr.addQuery('sys_id', '965c9e5347c12200e0ef563dbb9a7156');
gr.query();
gr.next();
var comms = gr.comments
comms.setJournalEntry('Agrego desde el comms object', 'ams');
comms.update();


SetJournalComments


gr = new GlideRecord('incident');
gr.addQuery('sys_id', '965c9e5347c12200e0ef563dbb9a7156');
gr.query();
gr.next();
var journal = new global.scopedSetJournalEntry();
journal.set(gr.comments,'scoped setJournalEntry test', 'aws');
gr.update();


gr = new GlideRecord('incident');
gr.addQuery('sys_id', '965c9e5347c12200e0ef563dbb9a7156');
gr.query();
gr.next();
var utils = new JournalUtils();
utils.setJournalEntry(gr.comments,'testing the JournalUtils setJournalEntry function');
gr.update();




//var utils = new JournalUtils();
gr = new GlideRecord('sys_history_line');
gr.addQuery("label", "Additional comments");
gr.setLimit(10);
gr.query();
while (gr.next()) {
  gs.info("History Line " + gr.label + '\n' +
          " Field" + gr.field + '\n' +
          " Id" + gr.id + '\n' +
          " line table" + gr.line_table + '\n' +
          " User" + gr.user_id + '\n' +
          " type " + gr['type'] + '\n' +
          " audit sys id " + gr['audit_sysid'] + '\n' +
          " created_on " + gr['sys_created_on'] + '\n' +
          " set " + gr['set'] + '\n' +
          " Value " + gr['new']);
  
}



  var set = gr.set.getRefRecord();
  gs.info("History Set " + set.domain + '\n' +
          " id " + set.id + '\n' +
          " table " + set.table + '\n' +
          " internal_checkpoint " + set.internal_checkpoint);
  sys_audit = new GlideRecord('sys_audit');
  sys_audit.get(gr['audit_sysid']);
  gs.info("SYS Audit " + sys_audit.documentkey + '\n' +
                 " fieldname " + sys_audit.fieldname + '\n' +
                 " tablename " + sys_audit.tablename + '\n' +
                 " new value " + sys_audit.newvalue + '\n' +
                 " User " + sys_audit.user );
