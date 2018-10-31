// Functions to interact with journal entries.
var JournalUtils = Class.create();
JournalUtils.prototype = {
  initialize: function(){},
    // receives an activity attribute (incident.comments),
    // an object to add to the journal and a user to attribute the changes.
    setJournalEntry: function(element, object, user) {
      if (global.ScopedSetJournalEntry) {
        journal = new global.ScopedSetJournalEntry();
        journal.set(element, object, user);
      } else {
        element.setDisplayValue(object);
      }
    },
    // receives an instance of sys_journal_field 
    // returns true if the entry was added AWS.
    created_by_aws: function(entry) {
      gs.info("Comment " + entry.value + " by user " + entry.sys_created_by);
      if (entry.sys_created_by == gs.getProperty("x_195647_aws_.Config.AWS.username")) {
        return true;
      }
      return false;
    },
    //receives a user to impersonate from the application scope
    impersonate: function(user) {
      if (global.ScopedImpersonator) {
        var impersonator = new global.ScopedImpersonator();
        return impersonator.impersonate(user);
      }
    },

    type: 'JournalUtils'
};