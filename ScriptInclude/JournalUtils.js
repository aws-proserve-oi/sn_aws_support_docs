// Functions to interact with journal entries.
var JournalUtils = Class.create();
JournalUtils.prototype = {
  initialize: function(){},
    setJournalEntry: function(element, object, user) {
      if (global.scopedSetJournalEntry) {
        journal = new global.scopedSetJournalEntry();
        journal.set(element, object, user);
        gs.info("CALLING global seJournalEntry wrapper");
      } else {
        element.setDisplayValue(object);
        gs.info("WRAPPER does not exist");
      }
    },

    type: 'JournalUtils'
};