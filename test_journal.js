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
gr.comments.setJournalEntry('Vamos por la co', 'ams');
gr.update();


SetJournalComments


gr = new GlideRecord('incident');
gr.addQuery('sys_id', '965c9e5347c12200e0ef563dbb9a7156');
gr.query();
gr.next();
var journal = new global.SetJournalComments();
journal.set(gr,'test push', 'ams');
//gr.comments.setJournalEntry('aguante la co', 'ams');
gr.update();

