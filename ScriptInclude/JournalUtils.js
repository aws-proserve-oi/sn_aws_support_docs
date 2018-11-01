// Functions to interact with journal entries.
gs.include('global.AwsSupportUtils');
var JournalUtils = Class.create();
JournalUtils.prototype = {

    initialize: function(){
      this.AwsSupportUtils = new global.AwsSupportUtils();
    },

    // receives a journal element (incident.comments),
    // an object to add to the journal and a user to attribute the changes.
    addAuthoredComment: function(incident, comm) {
      this.AwsSupportUtils.setJournalEntry(incident, comm.body, comm.submittedBy);
    },
    // receives an instance of sys_journal_field 
    // returns true if the entry was added by AWS.
    createdByAws: function(entry) {
      var user_name = gs.getProperty("x_195647_aws_.Config.AWS.username");
      if (entry.sys_created_by == user_name) {
        return true;
      }
      return false;
    },

    type: 'JournalUtils'
};