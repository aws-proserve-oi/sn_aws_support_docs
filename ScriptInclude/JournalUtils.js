// Functions to interact with journal entries.
var JournalUtils = Class.create();
JournalUtils.prototype = {
  initialize: function(){},
    // receives an activity attribute (incident.comments),
    // an object to add to the journal and a user to attribute the changes.
    setJournalEntry: function(element, object) {
      if (global.scopedSetJournalEntry) {
        journal = new global.scopedSetJournalEntry();
        journal.set(element, object, 'aws');
      } else {
        element.setDisplayValue(object);
      }
    },
    // receives an instance of sys_journal_field 
    // returns true if the entry was added AWS.
    created_by_aws: function(entry) {
      var incident = new GlideRecord('incident');
      incident.addQuery('sys_id', entry.element_id);
      incident.query();
      if (incident.hasNext()) {
        incident.next();
        var journal = incident.comments.getJournalEntry(1).split('\n');
        var journal_regexp = new RegExp('^' + journal[1] + '.*');
        gr = new GlideRecord('sys_history_line');
        gr.addQuery("field", "comments");
        gr.addQuery("user_id", "aws");
        gr.orderByDesc("sys_created_on");
        gr.setLimit(1);
        gr.query();
        if (gr.next()) {
          if (gr['new'].match(journal_regexp)) {
            return true;  
          }          
        }        
      }
      return false;
    },

    type: 'JournalUtils'
};