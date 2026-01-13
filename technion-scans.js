'use strict';

/* global BootstrapDialog, Promise, yadcf, Q, firebase */

var globalFunctions = {};

(function () {
    var courseNamesDictPromise = null;

    function fetchCourseNamesDict() {
        if (!courseNamesDictPromise) {
            courseNamesDictPromise = fetch('https://michael-maltsev.github.io/technion-course-names/names_new.json')
                .then(function (response) { return response.json(); });
        }
        return courseNamesDictPromise;
    }

    globalFunctions.scanAddComment = scanAddComment;
    globalFunctions.scanUpdateDetails = scanUpdateDetails;

    var displayCourse = stringToCourseNumber(getParameterByName('course'));
    if (displayCourse) {
        displayCourse = toOldCourseNumber(displayCourse);
    }

    var displayCourseNew = displayCourse && toNewCourseNumber(displayCourse);

    var searchQuery = getParameterByName('search');

    if (displayCourseNew) {
        fetchCourseNamesDict().then(function (courseNamesDict) {
            var newTitle = displayCourseNew;
            var displayCourseName = courseNumberToName(displayCourseNew, courseNamesDict);
            if (displayCourseName) {
                newTitle += ' - ' + displayCourseName;
            }
            newTitle += ' - מאגר סריקות';
            $('#main-title').text(newTitle);
            document.title = newTitle;
        });
    }

    $('#upload-new-scan-link').click(function () {
        var url = 'https://script.google.com/macros/s/AKfycbwydtnNiY0Pi5_znthdlZVKy3YP9khMMdtG8nSg_ejzpOl7_S9Y/exec?action=upload_frame';
        if (displayCourseNew) {
            url += '&course=' + displayCourseNew;
        }

        BootstrapDialog.show({
            title: 'שליחת סריקה חדשה',
            message: '<iframe src="' + url + '" frameBorder="0" width="100%" height="500px"></iframe>',
            size: BootstrapDialog.SIZE_WIDE,
            onshow: function (dialog) {
                dialog.getModalBody().css('padding', '0');
            }
        });

        return false;
    });

    var scansTable = $('#scans-table').DataTable({
        stateSave: true,
        fnStateLoadParams: function (oSettings, oData) {
            delete oData.columns;
            oData.search.search = searchQuery || '';
        },
        oSearch: {
            sSearch: searchQuery || ''
        },
        columnDefs: [
            {
                targets: [2, 4, 5, 6],
                render: function (data, type) {
                    return escapeHtml(data.toString());
                }
            }, {
                targets: 0,
                className: 'text-center',
                width: '1%',
                searchable: false,
                sortable: false,
                render: function (data) {
                    if (!/^[a-zA-Z0-9-_]+$/.test(data)) {
                        return '???';
                    }

                    var url = 'https://drive.google.com/file/d/' + data + '/view';
                    return $('<a target="_blank" rel="noopener" class="btn btn-secondary btn-sm">הצג</a>')
                        .prop('href', url).attr('onclick', 'arguments[0].stopPropagation();')[0].outerHTML;
                }
            }, {
                targets: 1,
                visible: !displayCourse,
                className: 'text-center',
                width: '1%',
                render: function (data, type) {
                    var courseNumberNew = toNewCourseNumber(data);
                    // var name = courseNumberToName(courseNumberNew, courseNamesDict);
                    var name = null;

                    if (type !== 'display') {
                        if (name) {
                            return escapeHtml(data + ' - ' + name);
                        } else {
                            return escapeHtml(data);
                        }
                    }

                    var link = $('<a>')
                        .prop('href', '?course=' + courseNumberNew)
                        .text(data);

                    if (name) {
                        link.attr('data-toggle', 'tooltip').prop('title', name);
                    }

                    return link[0].outerHTML;
                }
            }, {
                targets: 3,
                render: function (data, type) {
                    if (type === 'sort' || type === 'type') {
                        return data;
                    }

                    var text = (data && /^\d{6}$/.test(data)) ? semesterFriendlyName(data) : '???';

                    return escapeHtml(text);
                }
            }, {
                targets: 7,
                render: function (data, type) {
                    if (type !== 'display') {
                        return escapeHtml(data);
                    }

                    var textLimit = 60;
                    var textMinTruncateLen = 10;

                    if (data.length < textLimit + textMinTruncateLen) {
                        // Escape HTML while retaining line breaks.
                        return $('<div>').text(data).html().replace(/\n/g, '<br>');
                    }

                    var textShown = data.slice(0, textLimit);
                    var textHidden = data.slice(textLimit);

                    // Escape HTML while retaining line breaks.
                    var textShownHtml = $('<div>').text(textShown).html().replace(/\n/g, '<br>');
                    var textHiddenHtml = $('<div>').text(textHidden).html().replace(/\n/g, '<br>');

                    var seeMoreLink = $('<a href="#">הצג הכל</a>')
                        .attr('data-hidden-text', textHiddenHtml)
                        .attr('onclick', '$(this).parent().html($(this).attr(\'data-hidden-text\')); return false;');
                    var seeMoreSpan = $('<span>... </span>').append(seeMoreLink);
                    return textShownHtml + seeMoreSpan[0].outerHTML;
                }
            }, {
                targets: 8,
                className: 'text-center',
                width: '1%',
                searchable: false,
                sortable: false,
                render: function (data) {
                    if (!/^[a-zA-Z0-9-_]+$/.test(data)) {
                        return '???';
                    }

                    return '<button class="btn btn-secondary dropdown-toggle" id="actionsMenu" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">'
                        + '⚙</button>'
                        + '<div class="dropdown-menu" aria-labelledby="dropdownMenuButton">'
                        + '<a class="dropdown-item" href="#" onclick="globalFunctions.scanAddComment(this,\'' + data + '\');return false;">הוסף הערה</a>'
                        + '<a class="dropdown-item" href="#" onclick="globalFunctions.scanUpdateDetails(this,\'' + data + '\');return false;">עדכן פרטים</a>'
                        + '</div>';
                }
            }
        ],
        order: [[3, 'desc']],
        language: {
            // https://datatables.net/plug-ins/i18n/Hebrew
            processing: 'מעבד...',
            lengthMenu: 'הצג _MENU_ פריטים',
            zeroRecords: 'לא נמצאו רשומות מתאימות',
            emptyTable: 'לא נמצאו רשומות מתאימות',
            info: '_START_ עד _END_ מתוך _TOTAL_ רשומות',
            infoEmpty: '0 עד 0 מתוך 0 רשומות',
            infoFiltered: '(מסונן מסך _MAX_ רשומות)',
            infoPostFix: '',
            search: 'חפש:',
            url: '',
            paginate: {
                first: 'ראשון',
                previous: 'קודם',
                next: 'הבא',
                last: 'אחרון'
            }
        },
        preDrawCallback: function (settings) {
            this.find('[data-toggle="tooltip"]').tooltip('dispose');
        }
    });
    $('#scans-table').tooltip({ selector: '[data-toggle=tooltip]', boundary: 'window' });

    var yadcfColumnOptions = {
        filter_reset_button_text: false,
        filter_match_mode: 'exact',
        column_data_type: 'rendered_html',
        select_type: 'select2',
        select_type_options: {
            theme: 'bootstrap4',
            language: 'he',
            dropdownAutoWidth: true
        }
    };
    yadcf.init(scansTable, [
        $.extend({ column_number: 1, filter_default_label: 'קורס' }, yadcfColumnOptions),
        $.extend({ column_number: 3, filter_default_label: 'סמסטר', sort_as: 'custom', sort_as_custom_func: sortSemestersFunc }, yadcfColumnOptions),
        $.extend({ column_number: 4, filter_default_label: 'מועד' }, yadcfColumnOptions),
        $.extend({ column_number: 5, filter_default_label: 'מרצה אחראי' }, yadcfColumnOptions),
        $.extend({ column_number: 6, filter_default_label: 'מתרגל אחראי' }, yadcfColumnOptions)
    ]);

    firebaseInit();
    var firestoreDb = firestoreDbInit();

    if (!displayCourse) {
        loadCourseNames();
    } else {
        firestoreDb.collection('scans').doc(displayCourse).get()
            .then(function (doc) {
                var data = doc.exists ? doc.data() : {
                    scans: {},
                    comments: {}
                };
                var scans = data.scans;
                var comments = data.comments;
                var rows = [];
                Object.keys(scans).forEach(function (id) {
                    var d = scans[id];
                    var commentsJoined = (comments[id] || []).join('\n');
                    rows.push([
                        id,
                        displayCourse,
                        d.grade,
                        d.semester,
                        d.term,
                        d.lecturer,
                        d.ta,
                        commentsJoined,
                        id
                    ]);
                });
                $('#scans-table-container').removeClass('scans-table-container-hidden');
                $('#scans-table').DataTable().rows.add(rows).draw();
                $('#page-loader').hide();
            })
            .catch(function (error) {
                alert('Error loading data from server: ' + error);
            });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // https://stackoverflow.com/a/901144
    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    function stringToCourseNumber(str) {
        if (!str || !/^[0-9]{1,8}$/.test(str)) {
            return null;
        }

        if (str.length <= 6) {
            return ('00000' + str).slice(-6);
        } else {
            return ('0000000' + str).slice(-8);
        }
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

    function toNewCourseNumber(course) {
        var match = /^9730(\d\d)$/.exec(course);
        if (match) {
            return '970300' + match[1];
        }

        match = /^(\d\d\d)(\d\d\d)$/.exec(course);
        if (match) {
            return '0' + match[1] + '0' + match[2];
        }

        return course;
    }

    function firebaseInit() {
        var config = {
            apiKey: 'AIzaSyDoSZx7JsikUq1cGgvFkkNq_NRjAHhHIFQ',
            authDomain: 'scans-d504c.firebaseapp.com',
            databaseURL: 'https://scans-d504c.firebaseio.com',
            projectId: 'scans-d504c',
            storageBucket: 'scans-d504c.appspot.com',
            messagingSenderId: '753897952925'
        };
        firebase.initializeApp(config);
    }

    function firestoreDbInit() {
        var db = firebase.firestore();
        db.settings({ timestampsInSnapshots: true }); // silence a warning
        return db;
    }

    function loadCourseNames() {
        // select2 is 2 slow!
        /*$('#scans-course-select').select2({
            placeholder: 'בחרו קורס',
            allowClear: true,
            data: data
        });*/

        var DataProvider = function () {
            this.availableItems = null;
            this.items = null;
        };
        DataProvider.prototype.load = function () {
            var deferred = Q.defer();
            var self = this;
            if (this.availableItems) {
                deferred.resolve();
            } else {
                Promise.all([
                    fetchCourseNamesDict(),
                    firestoreDb.collection('scans').get()
                ]).then(function (results) {
                    var courseNamesDict = results[0];
                    var snapshot = results[1];
                    self.availableItems = [];
                    snapshot.docs.forEach(function (doc) {
                        var item = doc.id;

                        var courseNumberNew = toNewCourseNumber(item);
                        var id = courseNumberNew;
                        var name = courseNumberNew;
                        var courseName = courseNumberToName(courseNumberNew, courseNamesDict);
                        if (courseName) {
                            name += ' - ' + courseName;
                        }

                        self.availableItems.push({
                            id: id,
                            name: name
                        });
                    });
                    self.items = self.availableItems;

                    // Prevent flickering with setTimeout.
                    setTimeout(function () {
                        $('#scans-course-select-container').removeClass('d-none').addClass('d-flex');
                        $('#page-loader').hide();
                    }, 0);

                    deferred.resolve();
                }).catch(function (error) {
                    alert('Error loading data from server: ' + error);
                });
            }
            return deferred.promise;
        };
        DataProvider.prototype.filter = function (search) {
            var searchArray = search.toLowerCase().split(/\s+/);
            if (searchArray.length > 1 || (searchArray.length === 1 && searchArray[0] !== '')) {
                // Also search the old course numbers.
                var searchArrayAlt = searchArray.map(function (word) {
                    var course = stringToCourseNumber(word);
                    if (!course) {
                        return null;
                    }

                    course = toNewCourseNumber(course);
                    return course !== word ? course : null;
                });

                this.items = this.availableItems.filter(function (item) {
                    return searchArray.every(function (word, i) {
                        return (
                            item.name.indexOf(word) !== -1 ||
                            (searchArrayAlt[i] && item.name.indexOf(searchArrayAlt[i]) !== -1)
                        );
                    });
                });
            } else {
                this.items = this.availableItems;
            }
        };
        DataProvider.prototype.get = function (firstItem, lastItem) {
            return this.items.slice(firstItem, lastItem);
        };
        DataProvider.prototype.size = function () {
            return this.items.length;
        };
        DataProvider.prototype.identity = function (item) {
            return item.id;
        };
        DataProvider.prototype.displayText = function (item, extended) {
            if (item) {
                return item.name;
                //return extended ? item.name + ' (' + item.id + ')' : item.name;
            } else {
                return '';
            }
        };
        DataProvider.prototype.noSelectionText = function () {
            return 'בחרו קורס';
        };
        var dataProvider = new DataProvider();

        $('#scans-course-select').virtualselect({
            dataProvider: dataProvider,
            onSelect: function (item) {
                $('#scans-course-value').val(item.id);
                $('#scans-course-select-container button[type=submit]').prop('disabled', false);
            },
        }).virtualselect('load');
    }

    function scanAddComment(element, scanId) {
        // https://stackoverflow.com/a/30730405
        var row = $('#scans-table').DataTable().row($(element).closest('tr'));

        BootstrapDialog.show({
            title: 'הוסף הערה',
            message: '<input type="text" class="form-control" placeholder="הוסף הערה כאן...">',
            onshown: function (dialog) {
                dialog.getModalBody().find('input[type="text"]').focus();
            },
            buttons: [{
                label: 'הוסף',
                cssClass: 'btn-primary',
                hotkey: 13, // Enter.
                action: function (dialog) {
                    var text = dialog.getModalBody().find('input[type="text"]').val().trim().replace(/\s+/g, ' ');
                    if (text) {
                        var update = {};
                        update['comments.' + scanId] = firebase.firestore.FieldValue.arrayUnion(text);

                        var course = row.data()[1];
                        firestoreDb.collection('scans').doc(course)
                            .update(update)
                            .then(function () {
                                //console.log('Document successfully updated!');
                                if (row.data()[7]) {
                                    row.data()[7] += '\n';
                                }
                                row.data()[7] += text;
                                row.invalidate();
                            })
                            .catch(function (error) {
                                alert('Error updating document: ' + error);
                            });
                    }

                    dialog.close();
                }
            }]
        });
    }

    function scanUpdateDetails(element, scanId) {
        // https://stackoverflow.com/a/30730405
        var row = $('#scans-table').DataTable().row($(element).closest('tr'));

        var message = $('#update-details-form-container')[0].innerHTML;

        BootstrapDialog.show({
            title: 'עדכן פרטים',
            message: $(message),
            onshow: function (dialog) {
                var body = dialog.getModalBody();
                var data = row.data();

                var courseNumber = toNewCourseNumber(data[1]);

                var selectSemester = body.find('#detail-semester');
                var semesterEndMonths = ['03', '07', '10'];
                var done = false;
                var monthNow = new Date().toISOString().slice(0, '2000-01'.length);
                for (var year = 2000; !done; year++) {
                    for (var season = 1; !done && season <= 3; season++) {
                        var semester = year.toString() + '0' + season.toString();
                        selectSemester.prepend($('<option>', {
                            value: semester,
                            text: semesterFriendlyName(semester)
                        }));

                        var semesterEnd = (year + 1) + '-' + semesterEndMonths[season - 1];
                        done = semesterEnd > monthNow;
                    }
                }
                selectSemester.prepend($('<option value="">לחצו לבחירת סמסטר...</option>')).val('');

                body.find('#detail-course-id').val(courseNumber);
                body.find('#detail-grade').val(data[2]);
                selectSemester.val(data[3]);
                body.find('#detail-term').val(data[4]);
                body.find('#detail-lecturer').val(data[5]);
                body.find('#detail-ta').val(data[6]);
            },
            onshown: function (dialog) {
                dialog.getModalBody().find('#detail-grade').focus();
            },
            buttons: [{
                label: 'עדכן',
                cssClass: 'btn-primary',
                hotkey: 13, // Enter.
                action: function (dialog) {
                    var body = dialog.getModalBody();

                    var form = body.find('form').get(0);
                    if (form.checkValidity() === false) {
                        form.classList.add('was-validated');
                        return;
                    }
                    form.classList.remove('was-validated');

                    var data = {
                        grade: parseFloat(body.find('#detail-grade').val()),
                        semester: body.find('#detail-semester').val(),
                        term: body.find('#detail-term').val(),
                        lecturer: body.find('#detail-lecturer').val().trim().replace(/\s+/g, ' '),
                        ta: body.find('#detail-ta').val().trim().replace(/\s+/g, ' ')
                    };

                    var update = {};
                    update['scans.' + scanId] = data;

                    var course = row.data()[1];
                    firestoreDb.collection('scans').doc(course)
                        .update(update)
                        .then(function () {
                            //console.log('Document successfully updated!');
                            row.data()[2] = data.grade;
                            row.data()[3] = data.semester;
                            row.data()[4] = data.term;
                            row.data()[5] = data.lecturer;
                            row.data()[6] = data.ta;
                            row.invalidate();
                        })
                        .catch(function (error) {
                            alert('Error writing document: ' + error);
                        });

                    dialog.close();
                }
            }]
        });
    }

    function sortSemestersFunc(semester1, semester2) {
        var seasons = {
            'חורף': 1,
            'אביב': 2,
            'קיץ': 3
        };

        var semester1split = semester1.split(' ');
        var season1 = seasons[semester1split[0]] || 0;
        var year1 = parseInt(semester1split[1].slice(-4), 10);

        var semester2split = semester2.split(' ');
        var season2 = seasons[semester2split[0]] || 0;
        var year2 = parseInt(semester2split[1].slice(-4), 10);

        return year2 - year1 || season2 - season1;
    }

    function semesterFriendlyName(semester) {
        var year = parseInt(semester.slice(0, 4), 10);
        var semesterCode = semester.slice(4);

        switch (semesterCode) {
        case '01':
            return 'חורף ' + year + '-' + (year + 1);

        case '02':
            return 'אביב ' + (year + 1);

        case '03':
            return 'קיץ ' + (year + 1);

        default:
            return semester;
        }
    }

    // https://stackoverflow.com/a/6234804
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function courseNumberToName(course, courseNamesDict) {
        var dictExtra = {
            // Old courses.
            "00140103": "מבוא למכניקה הנדסית",
            "00140211": "מכניקת זורמים",
            "00340015": "תכן מכני 1",
            "00340033": "אנליזה נומרית מ'",
            "00440339": "פוטוניקה ולייזרים",
            "00460273": "תכנות פונקציונאלי מבוזר",
            "00460853": "ארכיטקטורות מחשבים מתקדמות",
            "00540135": "מבוא להנדסה כימית וביוכימית",
            "00860530": "אנליזה של מבנים דקי-דופן",
            "00860651": "תכן מערכות מכ\"ם",
            "00940201": "מבוא להנדסת נתונים ומידע",
            "00940313": "מודלים דטרמיניסטים בחקר ביצועים",
            "00940323": "מודלים דינמיים בחקר ביצועים",
            "00940334": "סימולציה-מידול, ניתוח ויישומים",
            "00940347": "מתמטיקה דיסקרטית",
            "00940821": "חשבונאות פיננסית וניהולית",
            "00950140": "תכנון פרויקטים וניהולם",
            "00970151": "תכן מתקנים",
            "01040017": "חשבון דיפרנציאלי ואינטגרלי 1נ'",
            "01040035": "משוואות דיפ' רגילות ואינפי 2ח'",
            "01040036": "חשבון דיפרנציאלי ואינטגרלי 1ת'",
            "01040167": "אלגברה א",
            "01040172": "מבוא לחבורות",
            "01040173": "אלגברה ליניארית ב'",
            "01040223": "מד\"ח וטורי פוריה",
            "01040282": "חשבון אינפי 3",
            "01040290": "תורת הקבוצות",
            "02340107": "אנליזה נומרית 1",
            "02340111": "מבוא למדעי המחשב",
            "02340112": "מבוא למחשב - שפת סי",
            "02340122": "מבוא לתכנות מערכות",
            "02340262": "תכן לוגי",
            "02340267": "מבנה מחשבים",
            "02340293": "לוגיקה ותורת הקבוצות למדעי המחשב",
            "02340322": "מערכות אחסון מידע",
            "02340325": "גרפיקה ממוחשבת 1",
            "02360200": "עיבוד אותות, תמונות ומידע",
            "02360315": "שיטות אלגבריות במדעי המחשב",
            "02360353": "אוטומטים ושפות פורמליות",
            "02360518": "סיבוכיות תקשורת",
            "02360607": "נושאים מתקדמים במדעי המחשב 7",
            "02360653": "נושאים מתקדמים באבטחת מידע ה'+ת'",
            "02740001": "מבוא לאנטומ מיקרוסקופית ומקרוסקופ",
            "03240263": "תולדות כדור הארץ",
            "03240456": "חשיבה: ביקורת ויצירה",
            "03240997": "יוון הקלאסית: ערש תרבות המערב",
            "03360528": "שחרור מבוקר של תרופות",

            // Prep school courses.
            "97030001": "גמר מתמטיקה-קדם מכינה",
            "97030002": "גמר פיזיקה-קדם מכינה",
            "97030003": "גמר מתמטיקה-מנהיגי העתיד",
            "97030004": "גמר פיזיקה-מנהיגי העתיד",
            "97030005": "מתמטיקה למכינה א",
            "97030006": "מתמטיקה למכינה ב",
            "97030007": "פיזיקה למכינה 1",
            "97030008": "פיזיקה חשמל",
            "97030009": "אנגלית מ-א",
            "97030010": "אנגלית מ-ב",
            "97030011": "כתיבה מדעית מ-א",
            "97030012": "כתיבה מדעית מ-ב",
            "97030013": "מתמטיקה מכינה בינלאו",
            "97030014": "פיזיקה בינלאומי",
            "97030015": "עברית בינלאומי",
            "97030016": "פסיכומטרי",
            "97030017": "מתמטיקה לקדם חרדים",
            "97030018": "פיזיקה קדם ירדים",
            "97030019": "אנגלית קדם ירדים",
            "97030020": "מתימטיקה הכנה למימד",
            "97030021": "אנגלית הכנה למימד",
            "97030022": "מתמטיקה ק.ע.ל",
            "97030023": "פיזיקה ק.ע.ל",
            "97030024": "אנגלית ק.ע.ל",
            "97030025": "כתיבה מדעית ק.ע.ל",
            "97030026": "מתמטיקה קדם הישגים",
            "97030027": "פיזיקה קדם הישגים",
            "97030028": "אנגלית קדם הישגים",
            "97030029": "כתיבה מדעית קדם הישג",
            "97030030": "קדם מכינה לעברית",
            "97030031": "עברית יעל",
            "97030032": "מכניקה סווג",
            "97030033": "חשמל סווג",
            "97030034": "מתמטיקה צעד לפני כולם",
            "97030035": "עיברית צעד לפני כולם",
            "97030036": "שפת סי צעד לפני כולם",
            "97030037": "קורס ריענון פיזיקה",
            "97030038": "קורס ריענון מתמטיקה",
            "97030039": "קורס עיברית",
            "97030040": "מתמטיקה מכינה",
            "97030041": "פיסיקה מכינה",
            "97030042": "אנגלית מכינה",
            "97030043": "כתיבה מדעית מכינה",
            "97030044": "מיומנויות חרדים",
            "97030045": "תג.אנג מכ-א",
            "97030046": "תג.אנג מכ-ב",
            "97030047": "תג.עבר מכ-א",
            "97030048": "תג.עבר מכ-ב",
            "97030080": "מבחן כניסה במתמטיקה",
            "97030081": "מבחן כניסה בעברית",
        };

        return courseNamesDict[course] || dictExtra[course] || null;
    }
})();
