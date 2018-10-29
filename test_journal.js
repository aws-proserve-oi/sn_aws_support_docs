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
journal.set(gr.comments,'scoped setJournalEntry test', 'ams');
gr.update();


gr = new GlideRecord('incident');
gr.addQuery('sys_id', '965c9e5347c12200e0ef563dbb9a7156');
gr.query();
gr.next();
var utils = new JournalUtils();
utils.setJournalEntry(gr.comments,'testing the JournalUtils setJournalEntry function', 'ams');
gr.update();