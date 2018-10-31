// Functions to interact with journal entries.
var JournalUtils = Class.create();
JournalUtils.prototype = {
    initialize: function(){},

    // receives a journal element (incident.comments),
    // an object to add to the journal and a user to attribute the changes.
    setJournalEntry: function(element, object, user) {
      if (global.ScopedSetJournalEntry) {
        journal = new global.ScopedSetJournalEntry();
        journal.set(element, object, user);
      } else {
        gs.debug("Missing Global Script Include ScopedSetJournalEntry, case communications will be authored as admin.");
        element.setDisplayValue(object);
      }
    },
    // receives an instance of sys_journal_field 
    // returns true if the entry was added by AWS.
    created_by_aws: function(entry) {
      var user_name;
      if (global.ScopedSetJournalEntry && global.ScopedImpersonator) {
        user_name = gs.getProperty("x_195647_aws_.Config.AWS.username");
      } else {
        user_name = 'admin';
      }
      if (entry.sys_created_by == user_name) {
        return true;
      }
      return false;
    },
    //impersonate the AWS user from the application scope.
    impersonate: function() {
      if (global.ScopedImpersonator) {
        var impersonator = new global.ScopedImpersonator();
        return impersonator.impersonate_aws_user();
      } else {
        gs.debug("Missing Global Script Include ScopedImpersonator, case communications will be authored as admin.");
      }
    },

    type: 'JournalUtils'
};