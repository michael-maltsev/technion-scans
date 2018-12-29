var rootFolderName = "Technion Scans";
var rootCacheName = "Technion Scans.cache";

function doGet(e) {
  var template, output;
  if (e.parameter['action'] === 'upload') {
    output = HtmlService.createHtmlOutputFromFile('upload_scan');
    output.setTitle('Upload a New Scan - Technion Scans');
  } else if (e.parameter['action'] === 'upload_frame') {
    template = HtmlService.createTemplateFromFile('upload_scan_frame');
    template.dataFromServerTemplate = {"course": e.parameter['course']};
    output = template.evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else if (e.parameter['action'] === 'update') {
    template = HtmlService.createTemplateFromFile('update_scan');
    template.dataFromServerTemplate = {"course": e.parameter['course'], "scan": e.parameter['scan']};
    output = template.evaluate();
    output.setTitle('Update Scan Details - Technion Scans');
  } else {
    template = HtmlService.createTemplateFromFile('browse_scans');
    template.dataFromServerTemplate = {"course": e.parameter['course'], "search": e.parameter['search']};
    output = template.evaluate();
    if ('course' in e.parameter) {
      output.setTitle(getCourseName(e.parameter['course']) + ' - Technion Scans');
    } else {
      output.setTitle('Technion Scans');
    }
  }
  return output;
}

function writeScansToCache(data) {
  var cacheFile = DriveApp.getFilesByName(rootCacheName);
  if (!cacheFile.hasNext()) {
    cacheFile = DriveApp.createFile(rootCacheName, JSON.stringify(data));
  } else {
    cacheFile = cacheFile.next();
    cacheFile.setContent(JSON.stringify(data));
  }
}

function getScansFromCache() {
  var cacheFile = DriveApp.getFilesByName(rootCacheName);
  if (!cacheFile.hasNext()) {
    return null;
  }
  cacheFile = cacheFile.next();
  return JSON.parse(cacheFile.getBlob().getDataAsString());
}

function clearScansCache() {
  var cacheFile = DriveApp.getFilesByName(rootCacheName);
  while (cacheFile.hasNext()) {
    cacheFile.next().setTrashed(true);
  }
}

function uploadFiles(form) {
  try {
    if (!/^(0*[1-9][0-9]{0,5})$/.test(form['course-number'])) {
      return JSON.stringify({"status": 'error', "data": 'Invalid input'});
    }
    
    var courseNumber = ('000000' + form['course-number']).slice(-6);
    var fileBlob = form['scan-file'];
    var fileData = {
      "course-number": courseNumber,
      "grade": parseInt(form['grade'], 10),
      "year": parseInt(form['year'], 10),
      "semester": form['semester'],
      "type": form['type'],
      "comments": form['comments'],
      "original-name": fileBlob.getName()
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
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.COMMENT);
    } catch (error) {
      // Not supported, ignore.
    }
    clearScansCache();
    
    return JSON.stringify({"status": 'ok'});
  } catch (error) {
    return JSON.stringify({"status": 'error', "data": error.toString()});
  }
}

function uploadFilesFrame(form) {
  try {
    if (!/^(0*[1-9][0-9]{0,5})$/.test(form['detail-course-id'])) {
      return JSON.stringify({"status": 'error', "data": 'Invalid input'});
    }
    
    var courseNumber = ('000000' + form['detail-course-id']).slice(-6);
    var fileBlob = form['scan-file'];
    var fileData = {
      "course-number": courseNumber,
      "grade": parseInt(form['detail-grade'], 10),
      "semester": form['detail-semester'],
      "term": form['detail-term'],
      "lecturer": form['detail-lecturer'],
      "ta": form['detail-ta'],
      "comments": form['detail-comments'],
      "original-name": fileBlob.getName()
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
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.COMMENT);
    } catch (error) {
      // Not supported, ignore.
    }
    //clearScansCache();
    
    return JSON.stringify({"status": 'ok', "fileId": file.getId()});
  } catch (error) {
    return JSON.stringify({"status": 'error', "data": error.toString()+','+e.lineNumber+','+e.stack});
  }
}

function updateInfo(form) {
  try {
    if (!/^(0*[1-9][0-9]{0,5})$/.test(form['course-number'])) {
      return JSON.stringify({"status": 'error', "data": 'Invalid input'});
    }
    
    var courseFile = DriveApp.getFileById(form['scan-id']);
    var parentFolder = courseFile.getParents();
    parentFolder = parentFolder.next();
    
    var courseNumber = ('000000' + form['course-number']).slice(-6);
    if (courseNumber != parentFolder.getName()) {
      return JSON.stringify({"status": 'error', "data": 'Invalid input'});
    }
    
    var fileData = courseFile.getDescription();
    if (fileData !== null) {
      fileData = JSON.parse(fileData);
    } else {
      fileData = {
        "course-number": courseNumber,
        "original-name": courseFile.getName()
      };
    }
    fileData['grade'] = parseInt(form['grade'], 10);
    fileData['year'] = parseInt(form['year'], 10);
    fileData['semester'] = form['semester'];
    fileData['type'] = form['type'];
    fileData['comments'] = form['comments'];
    courseFile.setDescription(JSON.stringify(fileData));
    renameBlobOrFile(courseFile, makeScanName(fileData));
    clearScansCache();
    return JSON.stringify({"status": 'ok'});
  } catch (error) {
    return JSON.stringify({"status": 'error', "data": error.toString()});
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
  
  if (d['year'] && d['type']) {
    return d['course-number']
      +'_'+d['year']
      +'_'+d['semester']
      +'_'+d['type'].replace(/^Moed /, '').charAt(0)
      +'_'+d['grade'];
  } else {
    var semester = d['semester'];
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
    }
    
    var type = d['term'];
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
    }
    
    return d['course-number']
      +'_'+year
      +'_'+season
      +'_'+type
      +'_'+d['grade'];
  }
}

function loadScans() {
  try {
    var cachedData = getScansFromCache();
    if (cachedData !== null) {
      return JSON.stringify({"status": 'ok', "data": cachedData});
    }
    
    var rootFolder = DriveApp.getFoldersByName(rootFolderName);
    if (rootFolder.hasNext()) {
      rootFolder = rootFolder.next();
    } else {
      return JSON.stringify({"status": 'ok', "data": []});
    }
    
    var fileData, dataItem, dataArary = [];
    
    var courseFolders = rootFolder.getFolders();
    var courseFolder, courseFiles, courseFile;
    while (courseFolders.hasNext()) {
      courseFolder = courseFolders.next();
      courseFiles = courseFolder.getFiles()
      while (courseFiles.hasNext()) {
        courseFile = courseFiles.next();
        fileData = courseFile.getDescription();
        if (fileData !== null) {
          fileData = JSON.parse(fileData);
        } else {
          fileData = {
            "course-number": courseFolder.getName(),
            "grade": 999999,
            "year": 999999,
            "semester": 'zzzzzz',
            "type": 'zzzzzz',
            "comments": courseFile.getId()
          };
        }
        dataItem = [];
        dataItem.push(courseFile.getUrl());
        dataItem.push(getCourseName(fileData['course-number']));
        dataItem.push(escapeHtml(fileData['grade']));
        dataItem.push(escapeHtml(fileData['year']));
        dataItem.push(escapeHtml(fileData['semester']));
        dataItem.push(escapeHtml(fileData['type']));
        dataItem.push(escapeHtml(fileData['comments']));
        dataArary.push(dataItem);
      }
    }
    
    writeScansToCache(dataArary);
    return JSON.stringify({"status": 'ok', "data": dataArary});
  } catch (error) {
    return JSON.stringify({"status": 'error', "data": error.toString()});
  }
}

// https://stackoverflow.com/a/6234804
function escapeHtml(unsafe) {
  return unsafe.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}
