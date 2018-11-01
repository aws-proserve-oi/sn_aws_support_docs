// You can use this step to execute a variety of server-side javascript tests including
// jasmine tests and custom assertions
//
//
// Pass or fail a step: Override the step outcome to pass or fail. This is ignored 
//                      by jasmine tests
//
//  - Return true from the main function body to pass the step
//  - Return false from the main function body to fail the step
//
//
// outputs:       Pre-defined Step config Output variables to set on this step during 
//                execution that are available to later steps
//
// steps(SYS_ID): A function to retrieve Output variable data from a step that executed
//                earlier in the test. The desired step's sys_id is required
//
//  Example:
//
//      // Test step 1 - add data
//      var gr = new GlideRecord('sc_task');
//      // this sample step's Step config has Output variables named table and record_id
//      outputs.table = 'sc_task';
//      outputs.record_id = gr.insert();
//
//      // Test step 2 - access added data and validate
//      // check that the record exists (or that business logic changed it)
//      var gr = new GlideRecord("sc_task");
//      gr.get(steps(PREVIOUS_STEP_SYS_ID).record_id);
//      assertEqual({name: "task gr exists", shouldbe: true, value: gr.isValidRecord()});
//
//
// stepResult.setOutputMessage: Log a message to step results after step executes.
//                              Can only be called once or will overwrite previous 
//                              message
//
//  Example:
//
//      var gr = new GlideRecord('sc_task');
//      gr.setValue('short_description', 'verify task can be inserted');
//      var grSysId = gr.insert();
//      var justCreatedGR = new GlideRecord('sc_task');
//      if (justCreatedGR.get(grSysId)) {
//            stepResult.setOutputMessage("Successfully inserted task record");
//            return true; // pass the step
//      } else { 
//            stepResult.setOutputMessage("Failed to insert task record");
//            return false; // fail the step
//      }
//
//
// Note: describe is only supported in Global scope.
// Use 'describe' to create a suite of test scripts and 'it' to define test expectations
//
//  Example jasmine test:
//
//      describe('my suite of script tests', function() {
//            it('should meet expectations', function() {
//                  expect(true).not.toBe(false);
//            });
//      });
//      // make sure to uncomment jasmine.getEnv().execute(); outside the function body
//
//
// assertEqual: A function used to compare that assertion.shouldbe == assertion.value;
//              in case of failure it throws an Error and logs that the assertion by
//              name has failed
//
//  Example:
//
//      var testAssertion = {
//            name: "my test assertion",
//            shouldbe: "expected value"
//            value: "actual value",
//      };
//      assertEqual(testAssertion); // throws Error, logs message to test step output
//
(function(outputs, steps, stepResult, assertEqual) {
    if (global.AwsSupportUtils == undefined) {
      stepResult.setOutputMessage("Script Include ScopedImpersonator does not exists in the global scope.");
      return false;
    }

})(outputs, steps, stepResult, assertEqual);
// uncomment the next line to execute this script as a jasmine test
//jasmine.getEnv().execute();
