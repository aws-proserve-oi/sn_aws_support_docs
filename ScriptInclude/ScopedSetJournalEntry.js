// Add this function in a global script include with application scope access,
// to set journal entries in behalf of the AMS user.
var scopedSetJournalEntry = Class.create();
scopedSetJournalEntry.prototype = {
  initialize: function(){},
    set: function(element, object, user) {
      element.setJournalEntry(object, user);
    },

    type: 'scopedSetJournalEntry'
};