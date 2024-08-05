/* global DriveApp, HtmlService, Utilities */
/* eslint indent: ["error", 2] */

var rootFolderName = 'Technion Scans';

function doGet(e) {
  var template;
  var output;
  if (e.parameter.action === 'upload_frame') {
    template = HtmlService.createTemplateFromFile('upload_scan_frame');
    template.dataFromServerTemplate = { course: e.parameter.course };
    output = template.evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else {
    var newLink = 'https://michael-maltsev.github.io/technion-scans/';
    var getParams = '';
    if (e.parameter.course) {
      getParams += '&course=' + encodeURIComponent(e.parameter.course);
    }
    if (e.parameter.search) {
      getParams += '&search=' + encodeURIComponent(e.parameter.search);
    }
    if (getParams) {
      newLink += '?' + getParams.slice(1);
    }
    output = HtmlService.createHtmlOutput("<script>window.top.location.href='" + newLink + "';</script>");
  }
  return output;
}

function uploadFilesFrame(form) {
  try {
    if (!/^[0-9]{1,8}$/.test(form['detail-course-id'])) {
      return JSON.stringify({ status: 'error', data: 'Invalid input' });
    }

    var courseNumber = form['detail-course-id'];
    if (courseNumber.length <= 6) {
      courseNumber = ('00000' + courseNumber).slice(-6);
    } else {
      courseNumber = ('0000000' + courseNumber).slice(-8);
    }
    courseNumber = toOldCourseNumber(courseNumber);

    var fileBlob = form['scan-file'];

    var fileData = {
      'course-number': courseNumber,
      'grade': parseFloat(form['detail-grade']),
      'semester': form['detail-semester'],
      'term': form['detail-term'],
      'lecturer': form['detail-lecturer'],
      'ta': form['detail-ta'],
      'comments': form['detail-comments'],
      'original-name': fileBlob.getName()
    };

    var rootFolder = DriveApp.getFoldersByName(rootFolderName);
    if (rootFolder.hasNext()) {
      rootFolder = rootFolder.next();
    } else {
      rootFolder = DriveApp.createFolder(rootFolderName);
    }

    var courseFolder = rootFolder.getFoldersByName(courseNumber);
    if (courseFolder.hasNext()) {
      courseFolder = courseFolder.next();
    } else {
      courseFolder = rootFolder.createFolder(courseNumber);
    }

    renameBlobOrFile(fileBlob, makeScanName(fileData));
    var file = courseFolder.createFile(fileBlob);
    file.setDescription(JSON.stringify(fileData));
    /*try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.COMMENT);
    } catch (error) {
      // Not supported, ignore.
    }*/

    return JSON.stringify({ status: 'ok', fileId: file.getId() });
  } catch (error) {
    return JSON.stringify({ status: 'error', data: error.stack });
  }
}

function renameBlobOrFile(blobOrFile, newName) {
  var oldName = blobOrFile.getName();
  var ext = '';
  if (oldName.indexOf('.') > -1) {
    ext = oldName.substr(oldName.lastIndexOf('.'));
  }

  blobOrFile.setName(newName + ext);
}

function makeScanName(fileData) {
  // 234322_2017_Spring_B_85.pdf
  var d = fileData;

  if (d.year && d.type) {
    // Old data format.
    return d['course-number']
      + '_' + d.year
      + '_' + d.semester
      + '_' + d.type.replace(/^Moed /, '').charAt(0)
      + '_' + d.grade;
  }

  // New data format.
  var semester = d.semester;
  var year = parseInt(semester.slice(0, 4), 10) + 1;
  var season = semester.slice(4);
  switch (season) {
    case '01':
      season = 'Winter';
      break;
    case '02':
      season = 'Spring';
      break;
    case '03':
      season = 'Summer';
      break;
    default:
      season = 'Unknown';
      break;
  }

  var type = d.term;
  switch (type) {
    case 'מועד א\'':
      type = 'A';
      break;
    case 'מועד ב\'':
      type = 'B';
      break;
    case 'מועד ג\'':
      type = 'C';
      break;
    case 'בוחן אמצע':
      type = 'M';
      break;
    default:
      type = 'U';
      break;
  }

  return d['course-number']
    + '_' + year
    + '_' + season
    + '_' + type
    + '_' + d.grade;
}

function toOldCourseNumber(course) {
  var match = /^970300(\d\d)$/.exec(course);
  if (match) {
    return '9730' + match[1];
  }

  if (/^097300\d\d$/.exec(course)) {
    return course;
  }

  match = /^0(\d\d\d)0(\d\d\d)$/.exec(course);
  if (match) {
    return match[1] + match[2];
  }

  return course;
}
