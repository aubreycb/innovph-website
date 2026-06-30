/***** EXAM PORTAL WEB APP ROUTER ADD-ON *****/
/***** Paste this into the Exam Portal Backend Apps Script together with the backend functions. *****/

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    let output;

    if (payload.action === "getAvailableCourses") {
      output = getAvailableCourses();
    } else if (payload.action === "validateExamAccess") {
      output = validateExamAccess(
        payload.courseCode,
        payload.personalEmail,
        payload.trainingDate
      );
    } else {
      output = {
        status: "DENIED",
        code: "INVALID_ACTION",
        message: "Invalid Exam Portal request."
      };
    }

    return ContentService
      .createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "ERROR",
        message: err.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "OK",
      service: "INNOVPH Exam Portal Backend"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
