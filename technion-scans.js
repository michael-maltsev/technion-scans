'use strict';

/* global BootstrapDialog, yadcf, Q, firebase */

var globalFunctions = {};

(function () {

    globalFunctions.scanAddComment = scanAddComment;
    globalFunctions.scanUpdateDetails = scanUpdateDetails;

    var displayCourse = stringToCourseNumber(getParameterByName('course'));
    if (displayCourse) {
        displayCourse = toOldCourseNumber(displayCourse);
    }

    var displayCourseNew = displayCourse && toNewCourseNumber(displayCourse);

    var searchQuery = getParameterByName('search');

    if (displayCourseNew) {
        var newTitle = displayCourseNew;
        var displayCourseName = courseNumberToName(displayCourseNew);
        if (displayCourseName) {
            newTitle += ' - ' + displayCourseName;
        }
        newTitle += ' - מאגר סריקות';
        $('#main-title').text(newTitle);
        document.title = newTitle;
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
                    var name = courseNumberToName(courseNumberNew);

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
                firestoreDb.collection('scans').get().then(function (snapshot) {
                    self.availableItems = [];
                    snapshot.docs.forEach(function (doc) {
                        var item = doc.id;

                        var courseNumberNew = toNewCourseNumber(item);
                        var id = courseNumberNew;
                        var name = courseNumberNew;
                        var courseName = courseNumberToName(courseNumberNew);
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

        var semester1split = semester1.split(' ')
        var season1 = seasons[semester1split[0]] || 0;
        var year1 = parseInt(semester1split[1].slice(-4), 10);

        var semester2split = semester2.split(' ')
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

    function courseNumberToName(course) {
        /* eslint-disable */
        // technion-course-names_start
        var dict = {"00140003":"סטטיסטיקה","00140004":"נתוח מערכות","00140005":"מעבדה הנדסית","00140006":"מבוא לשיטות נומריות","00140008":"מידע גרפי הנדסי","00140013":"תהליכים הנדסיים","00140101":"פרויקט בקונסטרוקציות","00140102":"מבוא למכניקה הנדסית","00140104":"תורת החוזק 1","00140107":"מבוא לתורת האלסטיות","00140108":"סטטיקת מבנים","00140113":"יסודות","00140131":"פרויקט מורחב במבנים-חלק א'","00140132":"פרויקט מורחב במבנים-חלק ב'","00140143":"שיטות מחשב בסטטיקת מבנים","00140145":"תורת החוזק 2","00140146":"מבוא לדינמיקת מבנים ורעידות אדמה","00140147":"בניית המהנדס 1","00140148":"עקרי תכן מבנים","00140149":"מבני בטון 2","00140150":"מבני פלדה 1","00140151":"נושא אישי בהנדסת מבנים","00140153":"מבני בטון 1","00140201":"פרויקט בהנדסת מים 1","00140202":"פרויקט בהנדסת מים 2","00140205":"הידרוליקה","00140212":"מבוא להידרולוגיה הנדסית","00140213":"מבוא להידרוליקה והידרולוגיה","00140214":"יסודות מכניקת הזורמים","00140300":"סמינריון בהנ. סביבתית ומשאבי מים","00140301":"פרויקט בהנדסה סביבתית","00140302":"פרויקט בהנדסה סביבתית","00140305":"מעבדה לטיפול במים ושפכים","00140309":"טכנולוגיות מים ושפכים","00140313":"מיקרוביולוגיה סביבתית ואפידמיולוג","00140316":"מבוא להנדסת הסביבה","00140319":"מעבדה בכימיה של מים","00140320":"כימיה של המים","00140321":"טוקסיקולוגיה סביבתית","00140322":"יסודות הטיפול במים ושפכים","00140324":"מחקר אישי בהנ.מים וסב' למצטיינים","00140325":"תכן מערכות אספקת מים ואיסוף שפכים","00140326":"טכנולוגיות טיפול בפסולת מוצקת","00140327":"כימיה של המים","00140329":"מבוא לאנרגיה מתחדשת למהנדסי סביבה","00140330":"תהליכים בים סוף ומפרץ אילת","00140332":"כימיה של המים","00140405":"גיאולוגיה הנדסית","00140409":"גיאומכניקה","00140411":"הנדסת קרקע","00140412":"יסודות הטיפול במים ושפכים","00140501":"פרויקט בחומרים ותפקוד","00140503":"פרויקט מעבדתי בחומרי בניה (1)","00140505":"חומרי בנייה","00140506":"טכנולוגיה מתקדמת של בטון","00140512":"אקוסטיקה בהנדסה אזרחית","00140513":"בניה במתכות-חומרים וטכנולוגיה","00140518":"חומרים 1","00140520":"תפקוד פיזי ואקלימי של בניינים","00140600":"סמינריון בניהול הבנייה","00140601":"פרויקט בניהול הבנייה","00140603":"כלכלה הנדסית","00140609":"מיכון בבנייה","00140613":"ניהול משאבי אנוש בבנייה","00140615":"מבוא לניהול פיננסי בבנייה","00140616":"ביצוע פרויקטים, ניהול ומנהיגות","00140617":"תכנון ובקרה של פרוייקטי בנייה","00140618":"מבוא לניהול ובטיחות בבנייה","00140619":"שיטות ביצוע בבנייה","00140620":"עקרונות תכן מבנים בהנדסת ביצוע","00140621":"עקרונות תכן מבנים בהנדסת ביצוע","00140630":"מבוא להיבטים משפטיים בבנייה","00140631":"אומדן עלויות של פרויקטי תשתית","00140632":"פרויקטי תשתית: שיטות וניהול","00140702":"תכנון תחבורה","00140709":"מעבדת דרכים","00140710":"מיסעות גמישות","00140719":"פרויקט מורחב בתחבורה - חלק א'","00140720":"פרויקט מורחב בתחבורה - חלק ב'","00140721":"פרויקט בתכנון תחבורה","00140722":"פרויקט בהנדסת תעבורה","00140723":"פרויקט בתכן גיאומטרי של דרכים","00140724":"פרויקט במבנה דרכים","00140725":"מבוא לתחבורה מסילתית","00140726":"בטיחות בדרכים-תסקרים והתקנים","00140728":"תכנון תשתיות תחבורה","00140730":"מבוא להנדסת תחבורה","00140731":"מבוא לתכן מסעות","00140733":"הנדסה וניהול של תנועה","00140734":"תחבורה ציבורית","00140779":"תכן גיאומטרי ותפעול דרכים","00140814":"חשבון תאום 1","00140829":"תחיקת המדידה","00140831":"מחנה גיאודזיה בקדסטר","00140841":"יסודות המיפוי והמדידה 1","00140842":"יסודות המיפוי והמדידה 2","00140843":"פוטוגרמטריה 1","00140845":"תכנות מונחה עצמים למידע גיאוגרפי","00140846":"מסדי נתונים גיאו-מרחביים","00140848":"מבוא לגיאודזיה","00140849":"גיאודזיה מתמטית","00140851":"רשתות בקרה גיאודטיות","00140852":"מדידות ג'.פ.ס.","00140853":"מדידות הנדסיות מיוחדות","00140855":"עבוד תמונה לצורכי מיפוי","00140856":"עיבוד וניתוח מידע מרחבי תלת ממדי","00140857":"מערכות מידע גיאוגרפי 1","00140859":"מיפוי ימי","00140863":"מחנה מדידות 1","00140864":"מחנה מדידות 2","00140866":"סמינר במיפוי וגיאו-אינפורמציה","00140867":"פרויקט בגיאודזיה ומדידות 1","00140868":"פרויקט מתקדם במיפוי וגיאו-אינפו'","00140869":"פרויקט במיפוי ספרתי 1","00140877":"כרטוגרפיה ומבוא לממ\"ג","00140878":"מיפוי ממוחשב","00140879":"מיפוי נושאי","00140881":"יסודות המיפוי והמדידה 1ג'","00140882":"ניהול מקרקעין","00140885":"קדסטר 2","00140888":"קדסטר 1","00140889":"פוטוגרמטריה 2","00140890":"מבוא לספקטרוסקופיה וחישה מרחוק","00140935":"שיטות מדידה","00140940":"תופעות מעבר במערכות טבעיות","00140941":"הנדסת ניקוז עילי ותת קרקעי","00140942":"הנדסה הידרולית ומאגרים","00140943":"מעבדה לבקרה","00140945":"פרויקט בבקרה","00140952":"סקר קרקעות - מערכות מידע","00140956":"מבוא לכימיה של הקרקע","00140958":"הנדסת השקיה 1","00140966":"פרויקט בהנדסה סביבתית 2","00140972":"משאבות ומערכות שאיבה","00140977":"מבוא לתהליכי זרימה וזיהום בקרקע","00140978":"יסודות האקולוגיה","00140979":"מבוא לפיסיקה של אטמוספירה","00150007":"מכניקה יישומית 1","00150017":"ציוד מערכות ושיטות בעבודות עפר","00150019":"מבוא לבקרה","00160002":"אתיקה בהנדסה","00160101":"נ.נ. בה. מבנים: מבנים לתרחישי אש","00160102":"נ.נ. בה. מבנים: מבוא לאופ. הנדסית","00160111":"בטון דרוך","00160122":"תכן מבנים תחת עומסי הדף ואימפקט","00160142":"הנדסת רעידות אדמה","00160143":"מבני בטון 3","00160144":"מבוא לאלמנטים סופיים","00160203":"הנדסת מערכות משאבי מים 1","00160206":"מכניקת זורמים סביבתית","00160208":"הנדסה ימית","00160209":"הנדסת נמלים וחופים","00160210":"גלי מים","00160211":"הידרולוגיה של נגר על קרקעי","00160220":"נושאים באוקינוגרפיה פיסיקלית","00160223":"הידרולוגיה של מי תהום: זרימה, הסעת מומסים ושיקום","00160302":"זיהום אויר","00160304":"פיסיקה מתקדמת של האטמוספירה","00160328":"הפרדה ממברנלית בטיפול בשפכים","00160329":"הידרוביולוגיה","00160336":"טכנולוגיות לניהול משאבי אויר","00160337":"אלקטרוכימיה סביבתית","00160338":"טכנולוגיות טיפול בפסולת מוצקה","00160339":"גורל מזהמים אנתרופוגנים בסביבה","00160403":"מבוא למכניקת הסלע","00160503":"קיים של חומרי בנייה ומבנים","00160504":"אבטחת איכות ובקרת איכות בבנייה","00160505":"בנייה בעץ - חומרים וטכנולוגיה","00160619":"תכן טפסות לבטון","00160630":"מבוא לניתוח השקעות בשוק הנדל\"ן","00160709":"התכנון העירוני, האזורי והארצי וההשפעה התחבורתית עליו","00160713":"בקרה אופטימלית - תיאוריה ויישומים בתחבורה","00160801":"חשבון תאום 2","00160815":"פוטוגרמטריה ספרתית","00160818":"היבטים בקדסטר מודרני","00160819":"מיפוי ימי מתקדם","00160820":"חישה מרחוק למיפוי סביבתי","00160828":"עקרונות בהערכת שווי מקרקעין","00160829":"סדנה בהערכת שווי מקרקעין","00160831":"גיאו-אינפורמטיקה חישובית וכמותית","00160832":"ניווט ומערכות אינרציאליות","00160833":"שירותים מבוססי מיקום","00160834":"סדנא בפיתוח מערכות מידע גיאוגרפי","00160835":"היבטים נומריים בפתרון תצלומים","00160837":"למידת מכונה בהנדסה גיאו-סביבתית","00170012":"פיזיקה של סביבה נקבובית","00170022":"תהליכים ביולוגיים בהנדסת סביבתית","00170033":"מבוא לכמומטריה","00170036":"מבוא לחקלאות מדייקת","00180002":"אתיקה בהנדסה","00180104":"נושאים בה. מבנים: אופטימיזציה טופ","00180121":"עקרונות היציבות של מבנים","00180130":"סמינר מתקדם בהנדסת מבנים","00180139":"נושאים באופטימיזציה טכנולוגית","00180140":"נושאים נבחרים במבני פלדה","00180141":"בקרת מבנים תחת עומסים דינמיים","00180142":"תכנון בר קייא של מבנים, תשתיות וערים","00180417":"חלחול ויציבות מדרונות","00180418":"מבנים תומכים","00180501":"הערכת מחזור חיים במערכות הנדסה אזרחית וסביבתית","00180503":"שיטות ניסוי מתקדמות בחומרי בניה","00180504":"טכנולוגיה של בניה מבטון טרום","00180506":"בצוע וטכנולוגיה של עבודות בטון","00180600":"ייזום ובדיקת כדאיות פרויקטים הנדסיים","00180601":"ניהול חברת בנייה","00180603":"ניהול פיננסי בחברת בניה","00180610":"נושאים נבחרים בניהול הבניה - אינפורמטיקה וסמנטיקה בבניה","00180616":"אספקטים משפטיים בבניה","00180623":"סמינר מתקדם בניהול הבנייה","00180703":"סמינר מתקדם בהנדסת תחבורה ודרכים","00180706":"תכנון תחבורה מבוסס פעילויות","00180707":"הערכת פרוייקטים תחבורתיים","00180708":"מודלים מתקדמים בתכנון התחבורה","00180709":"מודלים בסימולצית תעבורה","00180710":"הנדסת מערכות אזרחיות וערים חכמות","00180814":"אנליזה של רשתות גיאודטיות","00180816":"אנליזה טופוגרפית","00180817":"עיבוד מידע גיאו-מרחבי","00180819":"חישה מרחוק רב מימדית","00180821":"סדנה יישומית ב-ג'י.אי.אס","00180826":"סמינר מתקדם בלימודי מקרקעין","00190001":"יסודות מתמטיים למהנדסים","00190003":"שיטות נומריות למהנדסים","00190004":"מבוא למכניקת הרצף","00190006":"שיטות כמותיות במערכות הנדסה וניהול","00190007":"פרקים נבחרים בסטטיסטיקה","00190054":"סמינר בבעיות מתקדמות בהנדסה חקלאית","00190057":"סמינר בהנדסת סביבה ומים","00190058":"נושאים מתקדמים בהנדסת מים קרקע וסביבה","00190062":"מודלים וסימולציה של מערכות טבעיות","00190136":"אופטימיזציה הנדסית","00190141":"דינמיקה של מיבנים 1","00190145":"נושאים נבחרים בבטון מזויין","00190149":"מכניקה של חומרים רכים","00190206":"הנדסת מערכות משאבי מים 2","00190309":"טיפול מתקדם במים","00190310":"טיפול מתקדם בשפכים","00190315":"סמינר בהנדסת הסביבה","00190318":"כימיה של הסביבה","00190319":"מיקרוביולוגיה של הסביבה","00190324":"עקרונות התברואה של מים ושפכים","00190326":"טיפול בפסולת מוצקת","00190335":"אירוסולים באטמוספירה","00190340":"נושאים מתקדמים בהנדסת הסביבה","00190427":"חוקים קונסטיטוטיביים בגיאומכניקה","00190429":"שיפור קרקע ויצוב מדרונות","00190430":"ביסוס","00190431":"מנהור בקרקעות רכות","00190432":"מכניקת מבנים טמונים","00190512":"פרקים מתקדמים במערכות צמנטיות","00190619":"בניה רזה-ניהול הייצור בתכן ובבנייה","00190624":"ניהול פרוייקטי בניה בשלב היזום","00190625":"ניהול פרוייקטים בסביבה דינמית","00190627":"מידול מידע בניין מתקדם בתכן ובביצוע","00190702":"תכן מתקדם של מיסעות כפיפות","00190704":"מעבדה לחמרי מבנה דרכים 1","00190705":"מעבדה לחמרי מבנה דרכים 2","00190707":"טכנולוגיות מתקדמות בסלילת מיסעות","00190709":"ניתוח רשתות תחבורה","00190710":"מודלים לניתוח ביקושים","00190714":"הנדסת תעבורה מתקדמת","00190718":"בקרת תנועה","00190719":"הנדסת אנוש במערכת התעבורה 1","00190721":"כלכלת תחבורה","00190813":"נושאים מתקדמים במפוי וגיאואינפורמציה","00190814":"יישומים מתקדמים בפוטוגרמטריה אנליטית","00190817":"מודלים מתמטיים של סנסורים","00340010":"דינמיקה","00340016":"תכן מכני 2","00340022":"מבוא למכטרוניקה","00340028":"מכניקת מוצקים 1","00340030":"תהליכי יצור","00340032":"מערכות ליניאריות מ'","00340034":"הנע חשמלי","00340035":"תרמודינמיקה 1","00340040":"מבוא לבקרה","00340041":"מעבר חום","00340043":"שרטוט הנדסי ממוחשב","00340045":"מבוא להחלטות כלכליות למהנדסים","00340047":"מעבדה מתקדמת בזרימה","00340048":"מבוא לשרטוט הנדסי","00340051":"דינמיקה ומכניקה של תנודות","00340052":"פרויקט דגל - רכב מרוץ פורמולה","00340053":"מכניקת מוצקים 2מ","00340054":"תכן מכני 1מ","00340055":"תורת הזרימה 1מ'","00340056":"מבוא לחישוב מדעי והנדסי","00340057":"מעבדה מתקדמת בהנדסת מכונות","00340058":"הסתברות וסטטיסטיקה למהנדסי מכונות","00340059":"מבוא להנדסה","00340205":"תכן מערכות הדראוליות ופנאומטיות 1","00340353":"פרויקט תכן מוצר חדש 1","00340354":"פרויקט תכן מוצר חדש 2","00340355":"פרויקט מחקרי בהנדסת מכונות 1","00340371":"פרויקט תכן לייצור","00340379":"פרויקט הנדסי 1","00340380":"פרויקט הנדסי 2","00340381":"פרויקט מחקרי בהנ. מכונות 2","00340382":"מתודולוגית פיתוח הנדסי 2","00340401":"מעבדה מתקדמת לרובוטים","00340404":"מעבדה מתקדמת בתיב\"ם","00340406":"מעבדה מתקדמת לבקרה ואוטומציה","00340410":"מעבדה מתקדמת לאנרגיה","00340411":"מעבדה מתקדמת למנועים והנדסת שריפה","00340413":"מעבדה לתכן וייצור","00340422":"מעבדה באופטיקה","00350001":"מבוא לרובוטיקה","00350003":"מערכות תיב\"מ 1","00350008":"אוטומציה תעשייתית","00350010":"קינמטיקה של מכניזמים","00350013":"שיטות מספריות בהנדסת מכונות 1","00350022":"אלמנטים סופיים לאנליזה הנדסית","00350023":"קרור ונהול תרמי של רכיבים אלקטרו.","00350024":"טריבולוגיה שימושית","00350026":"מבוא יצירתי להנדסת מכונות","00350028":"זרימה ותרמודינמיקה של טורבומכונות","00350032":"תכן מוצרים מבוססי מיקרו מעבד מ'","00350033":"מבוא למערכות משולבות חיישנים","00350034":"כשל חמרים","00350035":"תורת הזרימה 2","00350036":"תכן מערכות בקרה","00350039":"עבוד אותות לדיאגנוסטיקה ותנודות","00350041":"מכניקת מיקרומערכות","00350043":"מבוא לתורת האלסטיות","00350044":"הידרוסטטיקה של אוניות","00350046":"ניהול פרויקטים","00350048":"תכן משולב באנליזה","00350050":"תכנון מערכות אופטיות","00350051":"תכן אופטומכני","00350052":"אופטיקה לינארית ויישומים 1","00350053":"אנרגיה מתחדשת ובת קיימא","00350061":"הידרודינמיקה של אוניות","00350062":"אנליזה של מבנים","00350063":"אדריכלות ימית 1","00350091":"תרמודינמיקה  2","00350123":"מבוא למערכות ייצור 1","00350141":"מתקני כח וחם","00350146":"מנועי שריפה פנימית","00350147":"סמינר מיוחד בהנדסת מכונות 1","00350188":"תורת הבקרה","00350199":"שימוש המחשב בתורת הזרימה","00360001":"שיטות אנליטיות בהנדסת מכונות 1","00360003":"מבוא למכניקת הרצף","00360004":"מכניקת השבירה","00360005":"דינמיקה אנליטית 1","00360008":"זרימה דחיסה","00360009":"מעבר חום ומסה","00360010":"תורת הסיכה ההידרודינמית","00360012":"מערכות בקרה לינאריות","00360013":"אופטימיזציה של תהליכים","00360014":"עבודים פלסטיים של מתכות","00360015":"שיטות אלמנטים סופיים בהנדסה 1","00360020":"גאומטריה חישובית ומודלים לתיב\"ם 1","00360026":"קינמטיקה דינמיקה ובקרה של רובוטים","00360027":"דינמיקה של מבנים ימיים","00360031":"טריבולוגיה עיונית","00360032":"מכניקת זורמים אנליטית","00360035":"מבוא להנדסת שריפה","00360038":"תהליכי מעבר בפן ביני","00360039":"בקרת מבנים ומערכות מיכניות","00360044":"תכן תנועת רובוטים וניווט ע\"י חיישנים","00360048":"אנליזה של רטט לא לינארי","00360049":"רשתות עצביות לבקרה ודיאגנוסטיקה","00360050":"מערכות בקרה לא-לינאריות","00360053":"אמינות ובדיקות","00360055":"אופטיקה לינארית ויישומים  2","00360057":"שיטות פער-ידע להערכת סיכון ואמינות","00360058":"מיקרומכניקה של מוצקים 1","00360059":"נ.נ. במבוא לפיזיקה של פולימרים","00360062":"מכניקת מגע","00360063":"מידול מערכות בניסוי","00360064":"נושאים מתקדמים בהנדסת מכונות 4","00360065":"אלקטרו ומגנטו מכניקה לשפעול וחישה","00360070":"ננואופטיקה ומבני' אופט' מחזוריים","00360079":"בקרת פליטות מזהמים מכלי רכב","00360080":"מערכות הנעת רכב מתקדמות","00360081":"עקרונות תכן ויצור מיקרו-מערכות אלקטרומכניות","00360082":"עקרונות מנועי שריפה פנימית","00360087":"דינמיקה היברידית במערכות מכניות","00360088":"ננומכניקה חישובית של מוצקים","00360090":"ביומכניקה וחישה מכנית של תאים","00360097":"דינמיקה של מרוכבים ומטא-חומרים","00360099":"נושאים מתקדמים בהנדסת מכונות 11","00360101":"ביומכניקה של תנועת גוף האדם","00360103":"נושאים נבחרים באקוסטיקה פיזיקלית","00360104":"נושאים במכניקת זורמים לא ניוטונים","00360105":"חוזק וכשל של חומרים מרוכבים","00360106":"נושאים ביסודות אנליטיות במכונות","00360107":"נ.נ בחישה אינרציאלית מבוססת למידה","00360108":"נושאים בביוניקה ורובוטיקה לבישה","00360109":"נושאים: מבוא לחומרים לא מסודרים","00360110":"מכניקת זורמים לא ניוטוניים","00360710":"נושאים נבחרים ברובוטיקה מודולרית","00360711":"נושאים נבחרים במיקרופבריקציה","00360712":"נושאים בתכן ואנליזה של חומרים","00380075":"נושאים בדינמיקה וניסוי בגלים ותנו","00380301":"נושאים נבחרים בחלקיקים בזרימה","00380715":"תרמודינמיקה מתקדמת 1","00380717":"מעבר חום - הסעה","00380731":"מעבר חם - קרינה","00380742":"פלסטיות","00380746":"תכונות מכניות של חומרים הנדסיים","00380781":"בקרה והנחיה רובסטית בגישת המינמקס","00380782":"שיטות מספריות במכניקת הזורמים","00380786":"מבוא למערכות דינמיות כאוטיות","00380789":"סמינריון.פרויקט מתקדם בהנדסת מכונות","00380800":"שיטות אנליזה ומידול במיקרו-מערכות","00380801":"מודלים של דינמיקה לא ליניארית","00380806":"השהיות בבקרה ובשערוך","00380807":"טורבולנציה, תאוריה ומעשה","00380808":"תכן מערכתי הנדסי מתקדם 1","00380809":"תכן מערכתי הנדסי מתקדם 2","00380811":"גלים לא לינאריים במערכות מכניות דיסקרטיות","00380812":"סמינר בהנדסת מכונות","00440000":"פרויקט מחקרי למצטיינים 1","00440098":"מבוא להנדסת חשמל לתעופה וחלל","00440101":"מבוא למערכות תכנה","00440102":"בטיחות במעבדות חשמל","00440105":"תורת המעגלים החשמליים","00440114":"מתמטיקה דיסקרטית ח'","00440124":"אלקטרוניקה פיסיקלית","00440127":"יסודות התקני מוליכים למחצה","00440131":"אותות ומערכות","00440137":"מעגלים אלקטרוניים","00440139":"ממירי מתח ממותגים","00440140":"שדות אלקטרומגנטיים","00440148":"גלים ומערכות מפולגות","00440157":"מעבדה בהנדסת חשמל 1א","00440158":"מעבדה בהנדסת חשמל 1ב","00440167":"פרוייקט א'","00440169":"פרויקט  ב","00440170":"פרויקט  מיוחד","00440173":"פרויקט ש' בתעשיה","00440175":"פרסום מאמר מדעי","00440176":"פרויקט ב' בתעשיה","00440180":"נושא אישי למצטיינים","00440184":"נושאים מתקדמים למצטיינים","00440185":"נושא מיוחד למצטיינים","00440191":"מערכות בקרה 1","00440198":"מבוא לעבוד ספרתי של אותות","00440202":"אותות אקראיים","00440214":"טכניקות קליטה ושידור","00440231":"התקנים אלקטרוניים 1","00440239":"תהליכים במיקרואלקטרוניקה","00440252":"מערכות ספרתיות ומבנה המחשב","00440268":"מבוא למבני נתונים ואלגוריתמים","00440334":"רשתות מחשבים ואינטרנט 1","00450000":"יזמות בהנ.אלקטרונ.,מחשבים ותקשורת","00450001":"פרויקט מבוא בהנדסת חשמל ומחשבים","00450002":"מבט-על להנדסת חשמל ומחשבים","00450100":"מעבדה לאלקטרומגנטיות בתקשורת","00450101":"מעבדה בתקשורת ספרתית","00450102":"מעבדה בבקרה לינארית","00450103":"מעבדה בפוטוניקה","00450104":"מעבדה במערכות ספרתיות מהירות","00450105":"מעבדה ברשתות מחשבים","00450106":"מעבדה באנרגיה ומערכות הספק","00450107":"מעבדה בלמידה עמוקה","00450108":"מעבדה בעיבוד תמונות","00450109":"מעבדה בעיבוד אותות","00450110":"מעבדה ב-וי.ל.ס.י אנלוגי","00450111":"מעבדה ב-וי.ל.ס.י ספרתי","00450112":"מעבדה באבטחת סייבר חומרה ותוכנה","00450113":"מעבדה בסיסית בתכנה","00450114":"מעבדה מתקדמת בתכנה","00450115":"מעבדה בראיה ממוחשבת","00450116":"מעבדה בארכיטקטורות מחשבים","00450117":"מעבדה במעבדי מחשבים","00450118":"מעבדה להתקני ננו-אלקטרוניקה","00450119":"מעבדה בלמידה רובוטית","00450120":"מע' במיקרוסקופיה אלקט' אינטרפרומ'","00450220":"מעב' במיקרוס' אלקטר' אינטטרפרונט'","00460002":"תכן וניתוח אלגוריתמים","00460004":"נושאים מתקדמים 2","00460005":"רשתות מחשבים ואינטרנט 2","00460007":"נושאים נבחרים ברשתות מחשבים למערכות למידה","00460010":"הסקה סטטיסטית","00460012":"מבוא לאלקטרוניקה גמישה אורגנית","00460042":"מבוא למערכות הספק ורשת חכמה","00460044":"מערכות אנרגיה מתחדשת","00460045":"תכן של ממירי מתח ממותגים","00460052":"אופטו-אלקטרוניקה קוואנטית","00460053":"אופטיקה קוונטית","00460054":"מחשוב קוונטי מודרני","00460055":"ננו-פוטוניקה ומטא חומרים אופטיים","00460187":"תכן מעגלים אנלוגיים","00460188":"מעגלים אלקטרוניים לאותות מעורבים","00460189":"תכן מסננים אנלוגיים","00460192":"מערכות בקרה 2","00460195":"מערכות לומדות","00460197":"שיטות חישוביות באופטימיזציה","00460200":"עבוד ונתוח תמונות","00460201":"עיבוד אותות אקראיים","00460202":"עיבוד וניתוח מידע","00460203":"תכנון ולמידה מחיזוקים","00460205":"מבוא לתורת הקידוד בתקשורת","00460206":"מבוא לתקשורת ספרתית","00460208":"טכניקות תקשורת מודרניות","00460209":"מבנה מערכות הפעלה","00460210":"מעבדה במערכות הפעלה","00460211":"למידה עמוקה","00460212":"מבוא לרובוטיקה ח'","00460213":"רובוטים ניידים","00460214":"פרויקט ברובוטים ניידים","00460215":"למידה עמוקה וחבורות","00460216":"מיקרוגלים","00460217":"למידה עמוקה","00460225":"עקרונות פיזיקליים של התקני מל\"מ","00460232":"פרקים בננו-אלקטרוניקה","00460237":"מעגלים משולבים - מבוא ל-וי.ל.ס.י.","00460239":"מעבדה בננו-אלקטרוניקה","00460240":"התקנים קוונטיים על-מוליכים","00460241":"מכניקה קוונטית","00460243":"טכנולוגיות קוונטיות","00460248":"פוטוניקה ולייזרים","00460249":"מערכות אלקטרו-אופטיות","00460251":"פוטוניקה בסיליקון","00460256":"אנטנות וקרינה","00460257":"מבוא למאיצי חלקיקים","00460265":"ארכיטקטורות ומעגלים בשילוב ממריסטורים","00460266":"שיטות הידור (קומפילציה)","00460267":"מבנה מחשבים","00460271":"תכנות ותכן מונחה עצמים","00460272":"מערכות מבוזרות: עקרונות","00460275":"תרגום ואופטימיזציה דינמיים של קוד בינארי","00460277":"הבטחת נכונות של תוכנה","00460278":"מאיצים חישוביים ומערכות מואצות","00460279":"חישוב מקבילי מואץ","00460280":"עקרונות וכלים באבטחת מחשבים","00460326":"מבוא לאותות ומערכות ביולוגיים","00460332":"מערכות ראיה ושמיעה","00460342":"מבוא לתקשורת בסיבים אופטיים","00460733":"תורת האינפורמציה","00460734":"תורת האינפורמציה לתקשורת קוונטית","00460745":"עבוד ספרתי של אותות","00460746":"אלגוריתמים ויישומים בראייה ממוחשבת","00460747":"למידה עמוקה לאותות דיבור","00460773":"התקני מל\"מ אלקטרואופטיים לגלוי","00460831":"מבוא לדימות רפואי","00460864":"ערוצי תקשורת מהירים בין שבבים","00460868":"יסודות תהליכים אקראיים","00460880":"תכן לוגי ממוחשב של שבבים","00460881":"אימות פורמלי לחומרה","00460882":"נ.נ. בתכנון משולב חומרה/תוכנה","00460887":"מבוא למחקר בפקולטה","00460903":"מעגלים משולבים בתדר רדיו","00460918":"תכן פיזי ממוחשב של שבבים","00460955":"נושאים בארכיטקטורת מרכזי נתונים","00460956":"נושאים נבחרים בהנדסת מחשבים : אנליזת זמנים  סטטית, מידול ואופטימיזציה","00460968":"מיקרו-עיבוד ומיקרו-מערכות אלקטרומכניות","00470100":"מקורות אולטרה מהירים מבוססי סיבים","00480000":"צילום חישובי","00480001":"נושאים בעיבוד וניתוח גאומטרי","00480004":"עיבוד וניתוח גיאומטרי של מידע","00480006":"נושאים בדחיסת תמונות ווידאו","00480010":"נושאים בלמידה עמוקה: טרנספורמרים","00480011":"טרנספורמרי ומודלי שפה גדולים","00480051":"פיזור אנרגיה בהתקנים אלקטרוניים","00480100":"אמינות במערכות לומדות","00480102":"נושאים בלמידה עמוקה על גרפים","00480104":"שיטות מונטה-קרלו לחישוב, למידה ותכנון","00480106":"שיטות אופטימיזציה מתקדמות ללמידה","00480150":"הסתברות בממד גבוה למדע הנתונים","00480201":"נושאים נבחרים בלמידה רובוטית","00480202":"נ. ברובוטיקה: נהיגה מרוץ אוטונומי","00480204":"נושאים נבחרים בבקרה – שווקי חשמל","00480214":"נ.נ ברובוטיקה: יישומים מודרניים","00480250":"קידוד רשת למערכות מידע ותקשורת","00480251":"קיבול שנון קוונטי","00480300":"נושאים בהסתברות ותהליכים אקראיים","00480350":"נושאים בלמידה עמוקה להדמיה רפואית","00480351":"עיבוד אותות ברפואה דיגיטלית","00480400":"נ.נ. בפיזור וחישה בסיבים אופטיים","00480401":"נושאים נבחרים ב אלקטרואופטיקה : מגברים אופטיים","00480712":"מעבדה באלקטרואופטיקה 2","00480716":"נושאים מתקדמים במערכות, למידה ובקרה 2","00480717":"נושאים מתקדמים במערכות, למידה ובקרה 3","00480732":"נושאים מתקדמים בתורת הגלים 1","00480747":"מעבדה באותות ומערכות ביולוגיים","00480812":"פיזיקה והתקנים של תחמוצות","00480816":"מעבדה לעבוד אותות","00480828":"עיבוד וניתוח אותות מרחביים","00480836":"מעבדה במעגלים מהירים","00480843":"ניסוי ומיצוי בסוכנים טבעיים ומלאכותיים","00480852":"מעבדה בהמרת אנרגיה","00480867":"נושאים נבחרים באלקטרו-אופטיקה 2","00480877":"מעבדה לתכנה וחומרה","00480886":"סמינר במערכות מחשב","00480888":"פרוטוקולי בלוקצ'יין ומטבעות","00480889":"סמינר בלמידה חישובית לרשתות מחשבים","00480890":"סמינר בהבטחת נכונות של למידה עמוקה","00480891":"אבטחת מערכות חומרה - מתיאוריה להתנסות","00480907":"אופטיקה בתווכים מפזרים ויישומיה בדימות ביו-רפואי","00480922":"מעבדה בראייה, מבנה תמונות וראיה ממוחשבת.","00480931":"מידות אינפורמציה ושימושיהן","00480933":"מעבדה לתקשורת","00480934":"תקשורת מקודדת","00480954":"שיטות סטטיסטיות בעיבוד תמונה","00480966":"מעבדה במיקרואלקטרוניקה","00480967":"מעבדה לרשתות מחשבים","00480976":"מעבדה במערכות מקביליות","00480980":"תיכנון וניהול רשתות תקשורת לא שיתופיות","00480989":"דינאמיקה של מערכות הספק","00480990":"סמינריון 1","00490005":"מעבדה בנושאי בקרה","00490006":"מעבדה לגלים אלקטרומגנטיים","00490014":"נושאים מתקדמים בהסתברות ותהליכים אקראיים 2","00490027":"תורת אינפורמציה למערכות מרובות משתמשים","00490032":"נושאים מתקדמים בתקשורת ואינפורמציה 4","00490037":"נושאים מתקדמים בוי.ל.ס.י 2","00490040":"קודי גרף ואלגוריתמי פענוח איטרטיביים","00490043":"דחיסת מידע אוניברסלית","00490053":"מעבדה בלמידה חישובית","00490056":"נושאים בראיה ממוחשבת: ניתוח צורה","00490061":"צפני קיטוב","00490062":"דימות ושחזור תלת-מימדי","00490063":"מידע בהתקני איחסון","00490064":"שיטות וריאציוניות בעיבוד תמונה","00540133":"מבט על הנדסה כימית וביוכימית","00540203":"עקרונות הנדסה כימית 1 מ'","00540309":"תהליכי הפרדה בהנדסה כימית","00540310":"מעבדה להנדסה כימית 1","00540314":"מבוא לדינמיקה ובקרת תהליכים מ'","00540316":"תרמודינמיקה א' מתקדם","00540318":"מעבדה להנדסה כימית 1 בכ'","00540319":"תרמודינמיקה ב' מתקדם","00540320":"עקרונות הנדסה כימית 2 ח'","00540321":"מבוא לתכן ריאקטורים כימיים(ח)","00540322":"עקרונות תכן ריאקטורים (ח)","00540323":"תהליכי הפרדה בהנ.כימית לסט' סביבה","00540324":"תהליכי הפרדה בהנ. כימית לביוכימית","00540330":"מעבדה לסימולציה בהנדסת תהליכים","00540350":"פולימרים 1","00540351":"פולימרים 2","00540367":"פרויקט מחקר 1","00540368":"פרויקט מחקר 2","00540369":"מעבדה להנדסת פולימרים","00540373":"מבוא לכימיה של מצב מוצק למהנדסים","00540374":"אנליזת תהליכים בשיטות נומריות מ'","00540375":"יצור התקני מל\"מ למהנדסים כימיים","00540376":"הנדסה אקולוגית בחיי היומיום","00540377":"מבוא לטכנולוגית אבקות","00540378":"מבנה ותכונות של פולימרים","00540400":"מעבדה   להנדסה כימית 2","00540406":"מחקר גמר 1","00540407":"מחקר גמר 2","00540410":"תיכון מפעלים מ'","00540411":"פרויקט בהנדסה כימית: אנרגיה","00540412":"הנדסה ביוכימית","00540413":"פולימרים ויישומיהם בביוטכנולוגיה","00540417":"תכון אינטגר. של תהליכים כימיים מ'","00540420":"מעבדה להנדסה כימית 2 בכ'","00540452":"בעיות סביבתיות-זיהום אויר","00540477":"חשיפה למחקר הבינתחומי","00540478":"מבוא להנדסה כימית וביוכימית מ'","00540479":"מבוא לדינמיקה ובקרת תהליכים מ'","00540480":"עקרונות הנדסה כימית 1ח'","00540482":"מבוא לתכן ריאקטורים (מ)","00540483":"מעבדה לתהליכים בתעשיית המיקרו","00560120":"מיקרוספית אלקטרוניים של חומר רך","00560146":"נושאים הנדסיים נבחרים","00560149":"שיטות אופטימיזציה ואנליזה נומרית מתקדמות","00560379":"מעבדה לתהליכי ממברנות","00560391":"חיישנים מבוססי ננו-(ביו) חומרים","00560394":"תבניות ריח: מבוא ויישומים","00560396":"חלקיקים קולואידים וכוחות בין מולקולריים","00560397":"ממברנות עקרונות וחומרים","00560398":"קטליזה על משטחים","00560402":"מודלים בכימיה מולקולרית וקינטית","00560403":"מערכות יוניות","00560404":"מעבדה להנדסת פולימרים","00560406":"נושאים במערכות חכמות למתן תרופות","00560407":"העצמת תהליכים כימיים","00560409":"מערכות חכמות למתן תרופות","00560410":"הנדסת ננו חלקיקים מחקי טבע","00580003":"דה קרבוניזציה ובקרת פליטות - ס","00580126":"תאי דלק","00580127":"תופעות מעבר-זרימת פלואידים","00580143":"תופעת מעבר - חום וחומר","00580162":"עבוד פולימרים","00580174":"סמינר מתקדם בהנדסה כימית","00580177":"שיטות מתמטיות בהנדסה כימית","00580183":"פולימרים בביוטכנולוגיה 2","00580185":"מצב מוצק בהנדסה כימית למוסמכים","00580186":"תרמודינמיקה סטטיסטית בהנדסה כימית","00640001":"עבודת גמר  1","00640002":"עבודת גמר 2","00640003":"עבודה מעשית בתעשית מזון","00640005":"פרויקט מיוחד","00640106":"תרמודינמיקה בהנדסת ביוטכנולוגיה ומזון","00640115":"מכניקה של זורמים","00640117":"תופעות מעבר חום","00640118":"תופעות מעבר חומר","00640119":"תכן מפעלים","00640120":"שיטות נומריות בהנ. ביוטכ' ומזון","00640122":"מבוא להנדסה ומדע","00640209":"טכנולוגיות מתקדמות בהנ.מזון וביוט","00640212":"טכנולוגיה של מזון","00640238":"מדע וטכנולוגיה של ביו-חומרים","00640239":"מע.בהנ. תהליכים וחומרים ביולוגיים","00640249":"טכנולוגיות עיבוד תוצרת טרייה","00640250":"מדע וטכנולוגיה של ביו-חומרים","00640251":"המדע מאחורי חלופות לבשר","00640253":"טכנו.מתקדמות בהנ.מזון וביוטכנולוגיה","00640254":"מעבדה בטכנולוגיות מתקדמות","00640322":"כימיה של מזון","00640324":"שיטות אנליטיות בביוטכ' ומזון","00640325":"מעבדה בביוכימיה","00640326":"מע.באנליזה:מזון וחומרים ביולוגיים","00640331":"מערכי תקינה","00640413":"מעבדה במיקרוביולוגיה","00640419":"מיקרוביולוגיה כללית","00640420":"מיקרוביולוגיה של מזון","00640507":"ביוטכנולוגיה מולקולרית","00640508":"מעבדה בריאקטורים ביולוגיים","00640509":"תהליכי יסוד בביוטכנולוגיה","00640522":"מבוא להנדסת ביוטכנולוגיה ומזון","00640523":"מבוא לביוטכנולוגיה מולקולרית","00640615":"תזונה","00660010":"תכן מפעלי מזון וביוטכנולוגיה","00660011":"פרויקט איג'ם","00660012":"פרויקט מתקדם בביוטכנולוגיה והנדסת מזון 1","00660013":"פרויקט מתקדם בביוטכנולוגיה והנדסת מזון 1","00660016":"נושאים נבחרים בהנדסת ביוטכנולוגיה ומזון 3","00660121":"דיאגנוסטיקה רפואית","00660215":"טכנולוגיה של מוצרי חלב","00660217":"אריזה וחיי מדף: מזון ומוצרים ביולוגיים","00660226":"טכנולוגיה לייצור יין","00660230":"הערכת מזון באמצעות החושים","00660241":"פרקים מתקדמים באריזת מוצרים","00660252":"מזון וקיימות","00660255":"מכניקה של חומרים רכים בביוטכנולוגיה ומזון","00660329":"אמולסיות במזון ובביוטכנולוגיה","00660332":"ביו-ננו היברידים וביוסנסורים","00660333":"ביורוקחות - פרמקולוגיה והובלה","00660334":"מיקרו-ננו אנקפסולציה לשחרור מבוקר","00660418":"מקרוביולוגיה של פתוגנים","00660421":"אנליזה של המיקרוביום","00660513":"ביוטכנולוגיה של תאים אנימליים","00660516":"מעבדה בביוטכנולוגיה מולקולרית","00660517":"טכנולוגיות גנטיות מתקדמות","00660525":"יזמות בהנדסת ביוטכנולוגיה ומזון","00660526":"ביולוגיה סינתטית","00660528":"שיטות מחקר במדעי המוח","00660529":"ביואינפורמטיקה של סרטן","00660531":"סמינר בביוטכנולוגיה חישובית","00660532":"מבוא לאנליזה של נתוני עתק ביולוגיים","00660533":"לקראת תאים סינטטיים","00660605":"תזונה מונעת, היבטים בריאותיים","00660614":"תזונה אישית","00680006":"פרויקט מיוחד","00680009":"סמינר מתקדם בהנדסת מזון","00680505":"סטטיסטיקה לתכנון ניסויים ואנליזה","00680509":"תהליכי יסוד בביוטכנולוגיה","00680512":"שיטות אנליטיות חדישות בביוטכנולוגיה","00840135":"אנליזה נומרית להנדסת אויר' וחלל","00840143":"הנדסת מערכות אויר-חלל","00840154":"שיטות ניסוי בהנדסה אוירונוטית","00840156":"שיטות ניסוי מתקדמות בה.אויר וחלל","00840213":"תרמודינמיקה","00840220":"מכניקת הטיס 1","00840221":"מכניקת הטיס 2","00840225":"דינמיקה","00840311":"אוירודינמיקה בלתי דחיסה","00840312":"זרימה דחיסה, כונסים ונחירים","00840314":"זרימה צמיגה ומעבר חום","00840506":"מכניקת מוצקים","00840515":"מבוא לתורת האלסטיות","00840630":"שרטוט הנדסי ממוחשב","00840641":"תכן הנ. וייצור של מערכות תעופתיות","00840651":"פרויקט תכן 51-פ.אסטרונוטיקה(חורף)","00840652":"פרויקט תכן 52-פ.אסטרונוטיקה(אביב)","00840653":"פרויקט תכן 53-פ.אווירונוטיקה-חורף","00840654":"פרויקט תכן 54-פ.אווירונוטיקה-אביב","00840737":"מערכות דינמיות","00840738":"תורת הבקרה","00840913":"יסודות הנדסת חלל","00850000":"חשיפה למחקר הנדסת אוירו' וחלל","00850156":"פרויקט ניסוי","00850201":"מבוא להנדסת אוירונוטיקה וחלל","00850220":"מעבדה במכניקת הטיס","00850305":"מעבדה באוירודינמיקה","00850322":"אוירודינמיקה שימושית","00850326":"סדנא לאוירודינמיקה חישובית","00850405":"מעבדה בהנעה ושריפה","00850406":"הנעה רקטית","00850407":"אמצעי הנעה - מנועי סילון","00850455":"מעבדה במנועי סילון וטורבינות","00850505":"מעבדה במבנים אוירונוטיים","00850605":"מעבדת אוויוניקה ותוכנת הטסה","00850634":"פרויקט בתכן מכני של רכיבים","00850640":"תמיכה כוללת במוצר למע. אויר חלל","00850695":"תכן ראשוני של מטוסים","00850705":"מעבדה בבקרה","00850801":"סמינריון בנושא זרימה","00850803":"סמינריון בנושא הנעה","00850804":"סמינריון בנושא בקרה","00850805":"סמינריון בנושא חלל","00850851":"פרויקט מחקר 1","00850852":"פרויקט מחקר 2","00850905":"מעבדה במערכות חלל ולוויינות","00850915":"מכניקת גופים בחלל","00850920":"הנעה חשמלית לחלל","00850925":"מבוא לפיסיקה של הגזים","00860051":"הידוד זורם-מבנה בטבלות","00860150":"תקשורת נתונים ומחשבים למהנדסי מערכות","00860172":"שיטות נומריות בהנדסה אוירונוטית","00860201":"בליסטיקה חיצונית ודינמיקת קליעים.","00860219":"דינמיקה ואוירודינמיקה  של מסוקים","00860222":"ניתוח מערכות משובצות מחשב ותוכנתן","00860241":"אוירואלסטיות 1","00860284":"טורבינות רוח והפקת אנרגיה","00860289":"בקרת מערכות רבות קלט ופלט","00860290":"בקרת מסלולי לוויינים","00860312":"בקרה לא לינארית","00860320":"מעבר חום בהנדסת אוירונוטיקה וחלל","00860321":"נושאים נבחרים בתורת הזרימה 1","00860325":"דינמיקה ויציבות זרימות רב-פאזיות","00860326":"קוויטציה ודינמיקת בועות","00860366":"מבוא לזרימה טורבולנטית","00860376":"אוירודינמיקה חישובית","00860380":"מבוא לשכבות גבול","00860385":"מבוא לזרימות גזים קלושים","00860389":"אוירודינמיקה של גופים וכנפיים","00860395":"אוירואקוסטיקה של כלי טיס","00860401":"מערכות הנעה לכלי טייס המונעים במדחף","00860403":"הנעה רקטית בהודף מוצק","00860414":"מנועי מגח סילון","00860461":"נושאים נבחרים באמצעי הנעה 1","00860470":"מבוא לשריפה על קולית","00860478":"תהליכי שריפה","00860480":"יסודות אווירו-תרמיים של טורבו-מכונות","00860484":"שיטות מדידה מתקדמות בזרימה והנעה","00860520":"בעיות מצומדות בחומרים פונקציונליים לא ליניאריים","00860521":"נושאים נבחרים במבנים אוירו-חלל 1","00860522":"נושאים נבחרים במבנים אויר-חלל 2","00860534":"מבוא לניטור בריאות מבנים","00860535":"מכניקת השבר במבנים תעופתיים","00860574":"אלמנטים סופיים בהנדסה אוירונוטית","00860576":"תורת האלסטיות","00860580":"שיטות אופטימיזציה בתכן מבנים","00860723":"נושאים ברובוטיקה ובינה מלאכותית","00860730":"תיאום ובקרה של מערכות רב-סוכניות","00860733":"תהליכים אקראיים במערכות אויר-חלל","00860755":"דינמיקה ובקרה אוטומטית של כלי טייס","00860759":"מערכות ניווט","00860760":"עקרונות הנחיה וביות","00860761":"ניווט נעזר ראיה ממוחשבת","00860762":"קבלת החלטות אוטונומיות בתנאי אי ודאות","00860777":"יסודות בתורת השערוך","00860788":"תכן ניווט לווייני מבוסס גי.פי.אס","00860789":"תכן ניווט ג'.פי.אס","00860800":"יסודות הזרימה השגיא-קולית","00860822":"נושאים נבחרים בהנדסת אויר-חלל 2","00860921":"נושאים נבחרים בהנדסת חלל 1","00860923":"אסטרודינמיקה","00860924":"יסודות הנדסת פלסמת אוירו-חלל","00860926":"בקרת הכוון חלליות","00880104":"מתמטיקה שימושית בהנדסה אוירונוטית 2","00880209":"אינטגרציה של מערכות","00880221":"סמינר בהנדסת אוירונוטיקה וחלל 1","00880222":"סמינר בהנדסת אוירונוטיקה וחלל 2","00880223":"סמינר בהנדסת אוירונוטיקה וחלל 3","00880224":"סמינר בהנדסת אוירונוטיקה וחלל 4","00880316":"שיטות נומריות בזרימה עבר קולית","00880318":"תורת הכנף","00880320":"אוירו-והדרו-דינאמיקה של הנעה בטבע","00880321":"נושאים נבחרים בהנעה: תרמודינמיקה מתקדמת","00880751":"בקרה אופטימלית במערכות תעופתיות 1","00880752":"בקרה אופטימלית במערכות תעופתיות 2","00880759":"נושאים מתקדמים בהנחית טילים","00880780":"יציבות הידרודינמית ותרמית של שכבות גבול","00880785":"פרוייקט סיום","00880792":"בקרה איתנה","00880794":"יסודות בהנדסת מערכות","00880795":"בקרה למהנדסי מערכות","00880796":"פרויקט סיום בהנדסת מערכות","00880900":"מערכות חלל מבוזרות","00940101":"מבוא להנדסת תעשיה וניהול","00940110":"קורס העשרה בהנדסת תעשיה","00940139":"נהול שרשראות אספקה ומע' לוגיסטיות","00940142":"תפעול מער' ייצור ושרות","00940170":"שיטות בהנדסת תעשיה","00940179":"הנדסת תעשיה בשטח","00940189":"קדם פרויקט תכן, הנדסת תעו\"נ","00940195":"פרויקט תכן 1, הנ. תעו\"נ","00940198":"אירועים בהנדסת תעשיה","00940202":"מבוא לניתוח נתונים","00940210":"ארגון המחשב ומערכות הפעלה","00940219":"הנדסת תוכנה","00940222":"הנדסת מערכות מבוססת מודלים","00940224":"מבני נתונים ואלגוריתמים","00940241":"ניהול מסדי נתונים","00940288":"נושאים אתיים באחריות בנתונים","00940290":"מעבדה באיסוף וניהול נתונים","00940295":"מעבדה בניתוח והצגת נתונים","00940312":"מודלים דטרמיניסטים בחקר ביצועים","00940314":"מודלים סטוכסטיים בחקר בצועים","00940333":"מודלים דינמיים בחקר ביצועים","00940345":"מתמטיקה דיסקרטית ת'","00940395":"קדם פרויקט תכן, הנדסת מ\"מ","00940396":"פרויקט תכן1, הנדסת מ\"מ","00940411":"הסתברות ת'","00940412":"הסתברות מ","00940423":"מבוא לסטטיסטיקה","00940424":"סטטיסטיקה 1","00940481":"מבוא להסתברות וסטטיסטיקה","00940503":"מיקרו כלכלה 1","00940504":"מיקרו כלכלה 2","00940513":"מאקרו כלכלה","00940564":"מבוא לניהול פיננסי","00940569":"שוק ההון וההשקעות","00940591":"מבוא לכלכלה","00940594":"עקרונות הכלכלה למהנדסים","00940600":"סמינר במדעי הקוגניציה","00940697":"פרויקט מחקר במדעי הקוגניציה","00940700":"מבוא להנדסת נתונים","00940701":"פרויקט מחקרי 1","00940702":"פרויקט מחקרי 2","00940703":"פרויקט מחקרי 3","00940704":"סדנת תכנות בשפת סי","00940820":"מבוא לחשבונאות","00940822":"חשבונאות ניהולית מתקדמת","00940842":"דיני מסים ומקרקעין","00950111":"תכן מערכות ייצור","00950113":"איכות פריון ותחזוקה","00950139":"ניהול פרויקטים","00950143":"חשיבה מערכתית בתעשייה וניהול","00950219":"כתיבת תוכנה ללמידת מכונה","00950280":"פרויקט תכן בלמידה חישובית","00950296":"שיטות אלגבריות בהנדסת נתונים","00950334":"סימולציה-מידול, ניתוח ויישומים","00950605":"מבוא לפסיכולוגיה","00950622":"מבוא למדעי המוח הקוגניטיביים","00960120":"הנדסת איכות","00960122":"סמינר באנליזה של רשתות בריאות","00960135":"ניהול מוצר בעולם הדיגיטלי","00960200":"כלים מתמטיים למדעי הנתונים","00960208":"בינה מלאכותית ומערכות אוטונומיות","00960210":"יסודות בינה מלאכותית וישומיה","00960211":"מודלים למסחר אלקטרוני","00960212":"מודלים גרפים הסתברותיים","00960222":"שפה חישוביות וקוגניציה","00960224":"ניהול מידע מבוזר","00960226":"חישוב, תורת המשחקים וכלכלה","00960231":"מודלים מתמטיים באחזור מידע מתקדם","00960232":"אתיקה של נתונים","00960235":"מערכות נבונות אינטראקטיביות","00960236":"למידה יוצרת ומודלי דיפוזיה","00960244":"מתודולוגיות מחקר בעיבוד שפה טבעית","00960250":"מערכות מידע מבוזרות","00960262":"אחזור מידע","00960265":"אלגוריתמים בלוגיקה","00960266":"חווית משתמש במערכות אינטראקטיביות","00960267":"מבוא לתכנות מאובטח","00960275":"הגורם האנושי באיסוף נתונים","00960290":"נושאים נבחרים בהנדסת נתונים ומידע","00960291":"מסחר אלגוריתמי בתדירות גבוהה","00960292":"שיטות חיזוי בפינטק","00960311":"תיאוריה ואלגוריתמים לאופטימיזציה","00960324":"הנדסת מערכות שירות","00960327":"מודלים לא לינאריים בחקר ביצועים","00960335":"אופטימיזציה בתנאי אי ודאות","00960336":"שיטות אופטימיזציה בלמידת מכונה","00960350":"קירובים באופטימיזציה קומבינטורית","00960351":"שיטות פוליהדרליות לתכנות בשלמים","00960401":"נושאים נבחרים בסטטיסטיקה והסתברות","00960411":"למידה חישובית 1","00960412":"ניהול וכריית תהליכים עסקיים","00960414":"סטטיסטיקה תעשייתית","00960415":"נושאים ברגרסיה","00960425":"סדרות עתיות וחיזוי","00960450":"השוואות מרובות","00960475":"תכנון ניסויים וניתוחם","00960501":"כלכלה למהנדסי מערכות","00960553":"כלכלת סביבה","00960555":"כלכלת סקטור ציבורי","00960556":"שוקי אופציות","00960570":"תורת המשחקים והתנהגות כלכלית","00960572":"נושאים מתקדמים בתורת המשחקים","00960573":"תורת המכרזים","00960576":"למידה וסיבוכיות בתורת המשחקים","00960578":"בחירה חברתית והחלטות משותפות","00960582":"נושאים מתקדמים בכלכלה","00960589":"אקונומטריקה למתקדמים","00960600":"התנהגות ארגונית","00960606":"כלכלה התנהגותית בסביבה טכנולוגית","00960609":"מודלים כמותיים במדעי ההתנהגות","00960617":"חשיבה וקבלת החלטות","00960620":"קוגניציה אנושית ויישומיה","00960622":"זהות ותהליכים קבוצתיים","00960625":"הצגת מידע חזותי וקוגניציה","00960644":"סמינר מחקרי בפסיכולוגיה סביבתית","00960690":"כלכלה התנהגותית: למידה וארגונים","00960693":"רשתות פסיכולוגיות וקוגניטיביות","00960694":"מטה קוגניציה","00960807":"יזמות חברתית","00960820":"מערכות ניהול קשרי לקוחות","00970135":"מחקר רב תחומי במערכות שירות","00970139":"ניהול שרשראות אספקה מתקדם","00970140":"שיטות מתקדמות בניהול פרויקטים","00970201":"עיבוד אותות דיבור עם למידה עמוקה","00970209":"למידה חישובית 2","00970215":"עיבוד שפה טבעית","00970217":"סמינר בעיבוד שפה טבעית","00970222":"ראייה ממוחשבת ויישומיה בחדר ניתוח","00970244":"רובוטים קוגניטיביים","00970246":"מודלי חישוב חברתי","00970247":"אינטרנט של הדברים: טכנולוגיות","00970248":"למידת מכונה ברפואה","00970249":"למידת מכונה בקבלת החלטות סדרתית","00970251":"אספקטים אסטרטגיים בלמידת מכונה","00970252":"תכנון אוטונומי בתנאי אי ודאות","00970280":"אלגוריתמים בתרחישי אי-וודאות","00970317":"תורת המשחקים השיתופיים","00970325":"תיאוריה ושיטות באופטימיזציה דלילה","00970334":"שיטות אלגבריות לתכנות בשלמים","00970400":"מבוא להסקה סיבתית","00970401":"נושאים נבחרים בהסתברות: פרקולציה","00970414":"סטטיסטיקה 2","00970447":"מבוא לחישוביות וסיבוכיות","00970449":"סטטיסטיקה אי פרמטרית","00970622":"מבוא למדעי הקוגניציה","00970644":"פסיכולוגיה תרבותית","00970702":"סמינר בבעיות מנייה לניהול נתונים","00970800":"עקרונות השיווק","00970910":"נ.נ. באינטגרציית אדם-מערכת","00970920":"נושאים בעיבוד שפה טבעית ממחקרי","00970922":"נושאים בלמידה עמוקה גיאומטרית","00970980":"נושאים בפרטיות ואתיקה של מידע","00980123":"ניהול פרויקטים להנדסת מערכות","00980291":"פרקטיקום (התנסות מעשית) בארגונים","00980310":"חקר ביצועים ואופטימיזציה למהנדסי מערכות","00980322":"סמינר במתודולוגיות באופטימיזציה","00980331":"תכנות לינארי וקומבינטורי","00980409":"סמינר משתלמים 1","00980413":"תהליכים סטוכסטיים","00980414":"תיאוריה סטטיסטית","00980425":"סמינר בסדרות עתיות","00980435":"סמינר בהסתברות ותהליכים סטוכסטיים","00980455":"הסתברות ותהליכים סטוכסטיים 2","00980460":"יישומי ניתוח רב-משתני","00980602":"התנהגות בארגונים","00980603":"איסוף נתונים ומחקר במדעי ההתנהגות","00980610":"הגורם האנושי במערכות טכנולוגיות","00980663":"סמינר בהתנהגות צרכנים","00980666":"מדעי הקוגניציה המתקדמים","00980960":"ביצועים ומיטביות סוביק. של עובדים","00990400":"סדנה בסטטיסטיקה לדוקטורנטים","00990601":"סמינר מתקדם במחקר פסיכולוגי","00990621":"סמינר בדינמיקה קבוצתית","00990624":"סמינר מחקר אישי","00990635":"סמינר שטח במדעי ההתנהגות  בניהול","00990777":"פרויקט ביזמות מרעיון להשקעה","00990860":"ניהול בכלכלה הגלובלית","01030015":"השלמות מתמטיקה","01040000":"מוכנות מתמטית לפיזיקה","01040002":"מושגי יסוד במתמטיקה","01040003":"חשבון דיפרנציאלי ואינטגרלי 1","01040004":"חשבון דיפרנציאלי ואינטגרלי 2","01040012":"חשבון דיפרנציאלי ואינטגרלי 1ת'","01040013":"חשבון דיפרנציאלי ואינטגרלי 2ת'","01040016":"אלגברה 1/מורחב","01040018":"חשבון דיפרנציאלי ואינטגרלי 1מ'","01040019":"אלגברה ליניארית מ'","01040022":"חשבון דיפרנציאלי ואינטגרלי 2מ'","01040030":"מבוא למשוואות דיפרנציאליות חלקיות","01040031":"חשבון אינפיניטסימלי 1מ'","01040032":"חשבון אינפיניטסימלי 2מ'","01040033":"אנליזה וקטורית","01040034":"מבוא להסתברות ח'","01040038":"אלגברה 2מ","01040041":"חשבון דיפרנציאלי ואינטגרלי 1מ1","01040042":"חשבון דיפרנציאלי ואינטגרלי 1מ2","01040043":"חשבון דיפרנציאלי ואינטגרלי 2מ1","01040044":"חשבון דיפרנציאלי ואינטגרלי 2מ2","01040064":"אלגברה 1מ1","01040065":"אלגברה 1מ2","01040066":"אלגברה א'","01040112":"גיאומטריה וסימטריה","01040119":"פרויקט במתמטיקה שמושית","01040122":"תורת הפונקציות 1","01040131":"משוואות דיפרנציאליות רגילות/ח","01040134":"אלגברה מודרנית ח","01040135":"משוואות דפרנציאליות רגילות ת'","01040136":"משוואות דיפרנציאליות רגילות מ","01040142":"מבוא למרחבים מטריים וטופולוגיים","01040144":"טופולוגיה","01040157":"מבוא לתורת המספרים","01040158":"מבוא לחבורות","01040163":"סמינר לסטודנטים להסמכה 2","01040164":"סמינר לסטודנטים להסמכה 3","01040165":"פונקציות ממשיות","01040166":"אלגברה אמ'","01040168":"אלגברה  ב","01040174":"אלגברה במ'","01040177":"גיאומטריה דיפרנציאלית","01040181":"סמינר באנליזה להסמכה 1","01040182":"סמינר באנליזה להסמכה 2","01040183":"סמינר באלגברה להסמכה 1","01040185":"סמינר לסטודנ.בהסמכה1","01040192":"מבוא למתמטיקה שמושית","01040193":"תורת האופטימיזציה","01040195":"חשבון אינפיניטסימלי 1","01040214":"טורי פורייה והתמרות אינטגרליות","01040215":"פונקציות מרוכבות א'","01040220":"משוואות דפרנציאליות חלקיות ת'","01040221":"פונקצ' מרוכבות והתמרות אינטגרליות","01040222":"תורת ההסתברות","01040228":"משוואות דיפרנציאליות חלקיות מ'","01040250":"פתרון בעיות במתמטיקה בעזרת מחשב 1","01040252":"חידות ומתמטיקה 1","01040253":"חידות ומתמטיקה 2","01040273":"מבוא לאנליזה פונק. ואנליזת פורייה","01040274":"תורת השדות","01040276":"מבוא לאנליזה פונקציונלית","01040277":"נושאים במתמטיקה לתלמידי ארכיטקט.","01040279":"מבוא לחוגים ושדות","01040280":"מודולים, חוגים וחבורות","01040281":"חשבון אינפי 2","01040283":"מבוא לאנליזה נומרית","01040285":"משוואות דיפרנציאליות רגילות א'","01040286":"קומבינטוריקה","01040291":"אלגוריתמים קומבינטוריים","01040293":"תורת הקבוצות","01040294":"מבוא לאנליזה נומרית","01040295":"חשבון אינפיניטסימלי 3","01040814":"מבוא למדעי המחשב מ'","01040818":"ארגון ותכנות המחשב","01040823":"מערכות הפעלה","01040824":"מבוא לתכנות מערכות","01040918":"מבני נתונים 1","01040952":"מערכות ספרתיות ומבנה המחשב","01060009":"מרחבי סובולב של העתקות עם ערכים","01060010":"חשיפה למחקר מתמטי","01060011":"פרויקטים מחקריים 1","01060012":"פרויקטים מחקריים 2","01060015":"נושאים נבחרים בהוכחות פורמליות","01060062":"נושאים בפרטיות מידע ואלגוריתמים","01060156":"לוגיקה מתמטית","01060170":"אלגברה הומולוגית","01060309":"חבורות לי","01060330":"גאומטריה אלגברית","01060347":"מספרים אלגבריים","01060349":"הסתברות מתקדמת","01060350":"גיאומטריה רימנית","01060375":"שיטות אלגבריות בקומבינטוריקה","01060380":"אלגברה מודרנית 1","01060381":"אלגברה מודרנית 2","01060383":"טופולוגיה אלגברית","01060393":"תורת המטריצות","01060394":"חשבון וריאציות","01060395":"תורת הפונקציות 2","01060396":"תורת הגרפים","01060397":"תורת המספרים","01060405":"סמינר באלגברה 2","01060411":"תורת החבורות","01060413":"משוואות דיפרנציאליות חלקיות","01060423":"גיאומטריה קומבינטורית","01060427":"סמינר בגיאומטריה","01060429":"תהליכים סטוכסטיים","01060431":"משטחי רימן","01060432":"הצגות של החבורה הסימטרית","01060434":"סטטיסטיקה מתמטית","01060702":"פרקים נבחרים באלגברה","01060716":"פרקים נבחרים בקומבינטוריקה","01060723":"יריעות דיפרנציביאליות","01060742":"פרקים נבחרים בתורת ההסתברות","01060800":"נושאים בתורה הארגודית","01060802":"נושאים בתורת ההצגות","01060803":"נושאים בגאומטריה","01060804":"נושאים נבחרים בתורה הארגודית 2","01060860":"תורת הקומפילציה ס'","01060923":"נושאים נבחרים בתורת הקשיחות","01060927":"נושאים נבחרים בתורת המספרים 2","01060928":"נושאים נבחרים בקומבינטוריקה 2","01060929":"נושאים נבחרים באנליזה 2","01060931":"נושאים נבחרים באלגברה 1","01060935":"נושאים נבחרים בהסתברות","01060937":"נושאים נבחרים באנליזה מתמטית 4","01060941":"סמינר באנליזה","01060942":"אנליזה פונקציונלית","01060944":"מתמטיקה קוונטית: היסודות והמידע","01060960":"מערכות דינמיות 1 דינמיקה המלטונית","01080002":"תקשורת קוונטית ותאוריות משאבים","01140010":"תגליות מדעיות 1","01140011":"תגליות מדעיות 2","01140014":"מכניקה וגלים","01140020":"מעבדה לפיסיקה 1מ'","01140021":"מעבדה לפיסיקה  2מ","01140030":"מעבדה לפיסיקה 2 מח'","01140032":"מעבדה לפיסיקה 1ח'","01140034":"מעבדה לפיסיקה 2מפ'","01140035":"מעבדה לפיסיקה 3 - גלים","01140036":"פיסיקה סטטיסטית ותרמית","01140037":"מעבדה לפיסיקה 4מח'","01140038":"מעבדה לפיזיקה - גלים - 3מפ'","01140051":"פיסיקה 1","01140052":"פיסיקה 2","01140054":"פיסיקה 3","01140071":"פיסיקה 1מ","01140073":"פיזיקה קוונטית להנדסה","01140074":"פיסיקה 1פ'","01140075":"פיסיקה 2ממ","01140076":"פיסיקה 2פ'","01140077":"פיסיקה 1ל","01140078":"פיסיקה 2ל","01140081":"מעבדה לפיסיקה 1","01140082":"מעבדה לפיסיקה 2","01140086":"גלים","01140101":"מכניקה אנליטית","01140102":"מרחבי זמן וחורים שחורים","01140210":"אופטיקה","01140226":"דו\"ח סגל מחקר סתיו","01140227":"דו\"ח סגל מחקר אביב","01140229":"פרויקט","01140246":"אלקטרומגנטיות ואלקטרודינמיקה","01140248":"פיסיקה 1 ר","01140249":"פיסיקה 2 ר","01140250":"מעבדה לפיסיקה 5ת","01140251":"מעבדה לפיסיקה 6ת","01140252":"פרויקט ת","01150203":"פיסיקה קוונטית 1","01150204":"פיסיקה קוונטית 2","01160004":"פיסיקה של גרעינים וחלקיקים יסודיים","01160027":"תורת הרצף","01160028":"סמינר בפרקים נבחרים בפיסיקה חורף","01160029":"מבוא לביופיסיקה","01160030":"סמינר בפרקים נבחרים בפיסיקה-אביב","01160031":"תורת האינפורמציה הקוונטית","01160033":"תהליכים גרעיניים באסטרופיסיקה","01160034":"מערכות קוונטיות מקרוסקופיות","01160035":"תורת הקוונטים של החומר 1","01160040":"אינפורמציה קוונטית מתקדמת","01160041":"פיזיקה של לייזרים ואופטיקה קוונטית","01160042":"נושאים נבחרים באטומים אקזוטיים","01160083":"טכנולוגיות קוונטיות","01160095":"פיזיקה של סדרי גודל","01160105":"שיטות סטטיסטיות ונומריות בפיסיקה","01160110":"פיסיקה של האטמוספירה","01160114":"נושאים נבחרים בפיזיקה סטטיסטית של טורבולנציה","01160161":"נושאים בפיסיקה תיאורטית 1","01160210":"אופטיקה","01160217":"פיסיקה של מצב מוצק","01160321":"ביו-פיסיקה של התא","01160354":"אסטרופיסיקה וקוסמולוגיה","01160356":"מעבדה בטכנולוגיות קוונטיות","01160611":"נושאים נבחרים של מערכות חיות","01170001":"תורת המיתרים למתחילים","01170015":"פיסיקה של אטומים ומולקולות","01170016":"פיסיקת הפלסמה","01170018":"פיסיקה של מוליכים למחצה","01170140":"תורת החבורות בפיסיקה","01180018":"תיאורית מערכות רבות גופים","01180076":"מעבדה מתקדמת","01180085":"פיסיקה גלקטית 1","01180092":"שיטות גיאומטריות בפיסיקה","01180093":"פרקים נבחרים בגישות עיוניות","01180095":"קוסמולוגיה","01180105":"נושאים נבחרים בקוסמולוגיה וחלקיקים יסודיים","01180106":"נושאים נבחרים בשיטות-מתמטיות בפיסיקת החלקיקים היסודים","01180107":"נושאים נבחרים בתורת השדות הקוונטיים.","01180111":"נושאים נבחרים באסטרופיסיקה","01180115":"נושאים מתקדמים בפיסיקת כוכבים","01180116":"תהליכים פיסיקליים בתווך הבינכוכבי","01180121":"פיסיקת כוכבים","01180122":"תורת הקוונטים 3","01180123":"מבוא לפיסיקת החלקיקים","01180129":"מכניקה סטטיסטית 2","01180130":"מבוא ליחסות כללית","01180132":"תורת השדות הקוונטית 1","01180133":"תורת השדות הקוונטית 2","01180136":"אופטיקה אולטרה מהירה","01180137":"קרינה וחומר קוונטי","01180141":"נושאים נבחרים בביופיסיקה וחומר רך","01180142":"חורים שחורים וקריסה כבידתית","01180143":"תורת הקוונטים של החומר 2","01180144":"תורת הקוונטים של החומר 3","01180145":"פיזיקה של קרינת הרקע הקוסמית","01180147":"שיטות חישוביות בפיסיקה רב-גופית","01180148":"ננו-פוטוניקה קוונטית","01230015":"השלמות כימיה","01240107":"כימיה לפיזיקאים מ'","01240108":"כימיה לפיסיקאים","01240117":"יסודות הכימיה א'","01240118":"יסודות הכימיה ב'","01240120":"יסודות הכימיה","01240122":"מעבדה ביסודות הכימיה","01240210":"כימיה ביו-אי אורגנית","01240212":"מעבדה בכימיה אנליטית 1 מורחב","01240213":"כימיה אנליטית 2 (מורחב)","01240214":"מעבדה בכימיה אנליטית 2 מורחב","01240220":"כימיה אנליטית 1 (מורחב)","01240305":"כימיה אי-אורגנית","01240353":"פרויקט מחקר בכימיה","01240355":"פרוייקט מחקר מיוחד בכימיה","01240356":"מבוא למחקר בכימיה","01240358":"התמחות בתעשייה כימית","01240400":"כימיה קוונטית 1","01240408":"תורת הקוונטים ויישומיה בכימיה","01240413":"תרמודינמיקה סטטיסטית","01240414":"כימיה פיסיקלית-קינטיקה כימית","01240415":"כימיה פיסיקלית-תרמודינמיקה כימית","01240416":"אלקטרומגנטיות וחומר","01240417":"כימיה פיס-ספקטרוסקופיה מולקולרית","01240503":"כימיה פיסיקלית 1ב'","01240507":"כימיה כללית ופיזיקלית לרפואה","01240510":"כימיה פיסיקלית","01240605":"מע. בכימיה פיסיקלית 2 לכימאים","01240610":"מעבדה כימיה פיסיקלית 1","01240611":"מעבדת מבוא לפיסיקה כימית","01240613":"מעבדה בכימיה פיזיקלית 2","01240618":"מע. בכימיה פיסיקלית להנ. חומרים","01240703":"מבנה ופעילות בכימיה אורגנית","01240708":"כימיה אורגנית מורחב 1","01240711":"כימיה אורגנית 2מ'","01240801":"כימיה אורגנית 1ב","01240911":"מעבדה כימיה אורגנית 1","01240912":"מעבדה בכימיה אורגנית 2מ","01250000":"מבוא לכימיה קוונטית למהנדסים","01250001":"כימיה כללית","01250013":"מעבדה בכימיה כללית","01250101":"כימיה אנליטית 1 למהנדסים","01250102":"מעבדה כימיה אנליטית 1 למהנדסים","01250105":"מע.בכימיה אנליטית 1 להנ.ביוכימית","01250801":"כימיה אורגנית","01250803":"כימיה אורגנית לרפואה","01260200":"כימיה אי אורגנית מתקדמת 2","01260303":"מעבדה מתקדמת בכימיה אי-אורגנית ואורגנומתכתית","01260304":"ביולוגיה מבנית","01260600":"מעבדה מתקדמת בכימיה פיסיקלית","01260601":"כימיה פיסיקלית עיונית מתקדמת","01260602":"כימיה פיסיקלית ניסיונית מתקדמת","01260603":"כימיה חישובית יישומית","01260604":"מעבדה בטכנולוגיות קוונטיות א","01260605":"מעבדה בטכנולוגיות קוונטיות מתקדמת","01260700":"כימיה אורגנית מתקדמת","01260901":"מעבדה מתקדמת בכימיה אורגנית","01260902":"מעבדה מתקדמת בכימיה אורגנית פיסיקלית","01270002":"קטליזה הטרוגנית","01270005":"נושאים נבחרים בכימיה ביולוגית","01270010":"נושאים מתקדמים בכימיה פיזיקלית","01270107":"כימיה של פורפירינים ומטלופורפירינים","01270109":"כימיה   של הסביבה","01270206":"כימיה אנליטית באמצעות לייזרים","01270403":"כימיה פיסיקלית של השטח","01270415":"שיטות חישוב בכימיה קוונטית ויישומן","01270427":"מצב מוצק לכימאים (מורחב)","01270433":"שיטות נסיוניות במדעי השטח","01270435":"תופעות הרזוננס בטבע","01270436":"תרמודינמיקה של מערכות קטנות","01270438":"סימטריה ושימושיה בכימיה","01270441":"פוטוכימיה ביולוגית","01270443":"אלקטרוניקה מולקולרית","01270446":"מבוא לטכנולוגיה קוונטית מולקולרית","01270447":"יישומי טכנולוגיה קוונטית מולקולרית","01270451":"כימיה פיסיקלית של חומרים קוונטים","01270453":"אלקטרוכימיה: עקרונות ויישומים","01270454":"סימולציה נומרית בפיסיקה כימית","01270455":"אורביטלים מולקולריים בכימ' אורגנ'","01270459":"ספקטרוסקופיה של פאזה מעובה","01270461":"מבוא למערכות קוונטיות פתוחות","01270712":"פוטוכימיה אורגנית","01270727":"כימיה אורגנומתכתית בסינתזה אורגנית","01270729":"סינתזה סטראוסלקטיבית","01270730":"קביעת מבנה בשיטות פיסיקליות","01270735":"נושאים נבחרים בקטליזה הומוגנית","01270738":"כימיה אורגנית 3 מורחב","01270740":"פולימרים: מסינתזה לארכיטקטורות","01270741":"כימיה של פפטידים וחלבונים","01280001":"נושאים מתקדמים בכימיה 1","01280003":"נושאים מתקדמים בכימיה 3","01280007":"שיטות מחקר מתקדמות 1","01280008":"שיטות מחקר מתקדמות 2","01280413":"סמינר בכימיה פיסיקלית ואנליטית","01280713":"סמינר בכימיה אורגנית ואי-אורגנית","01280719":"הכימיה בפיתוח תרופות","01340019":"מבוא לביוכימיה ואנזימולוגיה","01340020":"גנטיקה כללית","01340039":"וירולוגיה מולקולרית","01340040":"פיזיולוגיה מוליקולרית של הצמח","01340049":"פרויקט מחקר בביולוגיה","01340058":"ביולוגיה 1","01340069":"ביולוגיה של ההתפתחות","01340082":"ביולוגיה מולקולרית","01340111":"זואולוגיה","01340113":"מסלולים מטבולים","01340117":"פיזיולוגיה","01340119":"בקרת הביטוי הגנטי","01340121":"מיקרוביולוגיה ווירולוגיה","01340123":"סמינר בביולוגיה 1","01340124":"סמינר ביולוגיה 2","01340125":"סמינר בביולוגיה 3","01340126":"סמינר בביולוגיה 4","01340127":"נושאים בביולוגיה","01340128":"ביולוגיה של התא","01340129":"הביולוגיה של מחלת הסרטן","01340133":"אבולוציה","01340134":"מעבדה בעולם החי","01340137":"תאי גזע","01340140":"יוביקוויטין ומחזור חלבונים","01340141":"ביולוגיה חישובית","01340142":"מעבדה בגנטיקה מולקולרית","01340143":"מעבדה בביוכימיה ומטבוליזם","01340144":"מעבדה בפיזיולוגיה של הצמח","01340147":"מטבוליזם ומחלות באדם","01340150":"פרויקט מחקר למסלול מצטיינים","01340151":"העולם המודרני של הרנ\"א","01340153":"אקולוגיה","01340154":"ביוסטטיסטיקה  לביולוגים","01340155":"אנדוקרינולוגיה","01340156":"ביופיסיקה מולקולרית","01340157":"מבוא לנוירוביולוגיה","01340158":"שיטות בביואינפורמטיקה למדעי החיים","01340159":"מעבדה בהנדסה גנטית","01340160":"חשיבה מדעית","01340161":"חשיפה למחקר עכשווי בביולגיה","01340163":"טכנול' ביולוגיות לקיימות גלובלית","01360014":"פיתוח תרופות ביולוגיות חדשניות","01360022":"מסלולי חישה במיקרואורגניזמים","01360037":"ביולוגיה מערכתית","01360042":"מודלים בביולוגיה","01360088":"גנטיקה מולקולרית של האדם","01360105":"ביולוגיה מולקולרית ותאית של התפתחות","01360158":"שיטות בביואינפורמטיקה למדעי החיים","01360203":"פוטוסינטזה ימית","01360204":"ביולוגיה של אלמוגים","01360205":"מיקרוביולוגיה ימית","01360206":"הכרת הפלנקטון","01380002":"הבסיס המולקולרי של מחלת הסרטן","01380008":"הפרדה ואפיון תאים בעזרת פאקס","01380012":"עריכה גנטית","01380013":"עקרונות בסיסיים בפיתוח תרופות","01380018":"פרוטיאומיקה","01380023":"אקולוגיה מיקרוביאלית","01380029":"נושאים מתקדמים בביולוגיה","01380033":"תהליכים מכניים בביוכימיה","01380034":"התגובה התאית לנזקים ב-דנ\"א","01380038":"גישות ניסוייות בחומצות גרעין","01380039":"תפקוד ומבנה חלבונים","01380045":"יסודות הטוקסיקולוגיה","01380047":"מדעי הנתונים הגנומיים","01380060":"עבודת מחקר 1","01380061":"עבודת מחקר 2","01380069":"שיטות מיקרוסקופיה במדעי החיים","01380074":"כלים בביואינפורמטיקה מבנית","01380083":"נושאים עדכניים בביולוגיה 1","01380084":"נושאים עדכניים בביולוגיה 2","01380085":"נושאים עדכניים בביולוגיה 3","01380086":"נושאים עדכניים בביולוגיה 4","01380087":"נושאים עדכניים בביולוגיה 5","01380088":"נושאים עדכנים בביולוגיה 6","01380500":"מבוא לתעשיית מדעי החיים","01380501":"נושאים נבחרים במדעי הנתונים ליישומים ביולוגיים ורפואיים","01960001":"סמינר במתמטיקה שימושית 2","01960012":"שיטות אנליטיות במיש. דיפ.","01960013":"אנליזה נומרית","01960014":"למידה עמוקה ותורת הקירובים","01960015":"חשיפה למחקר במתמטיקה יישומי","01970007":"אינפורמציה קוונטית ותורות משאבים","01970008":"נושאים נבחרים במתמטיקה שימושית","01970009":"נושאים נבחרים במתמטיקה שימושית 2","01970010":"נושאים נבחרים במתמטיקה שימושית 3","01970011":"נושאים נבחרים במתמטיקה שימושית 4","01970014":"נושאים נבחרים ברשתות קונבולוציה","01980000":"שיטות אסימפטוטיות","02040000":"מבוא לאדריכלות נוף","02040003":"נושאים נבחרים באדריכלות נוף 1","02040004":"מבוא למבנה ופרטי גן","02040006":"צמחיה בנוף 1","02040007":"צמחיה בנוף 3: תכנון צמחיה במרחב פתוח","02040060":"תכנון נוף 10","02040061":"תכנון נוף 20","02040062":"תכנון נוף 30","02040063":"תכנון נוף 40","02040064":"תכנון נוף 50","02040065":"תכנון נוף 60","02040066":"תכנון נוף 70","02040090":"תולדות אדריכלות נוף 1","02040091":"תולדות אדריכלות נוף 2","02040094":"תולדות אדריכלות נוף 2","02040150":"מבוא לאקולוגיה של הנוף","02040152":"הכרת נופים","02040202":"צמחיה בנוף 2:יסודות תכנון בצמחיה","02040204":"מבוא למערכות מידע גיאוגרפי","02040401":"מבנה ופרטי גנים 2","02040403":"מבנה ופרטי גנים 3-פרויקט מסכם","02040406":"תורת המבנה לאדריכלי נוף","02040407":"מבנה ופרטי גן 1","02040408":"מבנה ופרטי גן 3","02040409":"קריאות בנוף","02040626":"אדריכלות נוף חוקרת","02040652":"ייצוג נוף","02040712":"פרויקט/נושא מיוחד באדר.נוף-33ב'","02040716":"פרויקט/נושא מיוחד באדר.נוף-44א'","02040720":"נושאים נבחרים.פרויקט מיוחד באדריכלות נוף 55 ב'","02040721":"נושא/נבחר פר.מיוחד באדר' נוף 33ג'","02040724":"סיור לימודי באדריכלות נוף 3","02040725":"סיור לימודי באדריכלות נוף 4","02050000":"מבוא לשימור","02050012":"מבוא לחברה ורוח בארכיטקטורה","02050017":"תולדות האדריכלות בעידן המודרני","02050028":"שיטות בעיצוב, תיאוריה וכלים","02050071":"מורפולוגיה 1","02050096":"תולדות האומנות כאם האדריכלות","02050102":"תולדות אדר' מהעת העתיקה לעת החדשה","02050104":"הסט' ותיאוריה של אדר' מלח\"ע-כיום","02050105":"אדריכלות בישראל:המאה העשרים ואחת","02050152":"סוגיות בסוציולוגיה אורבנית","02050154":"סוגיות בפסיכולוגיה לאדריכלים","02050255":"רקמות אורבניות בישראל","02050257":"מבוא לעיצוב ותכנון עירוני","02050304":"מיני סטודיו עיצוב א'","02050410":"חומרים 1","02050426":"טכנולוגיות בנייה ופרטי בניין 1","02050427":"טכנולוגיות בנייה ופרטי בניין 2","02050430":"סדנה טכנולוגית הנדסית 1א'","02050458":"תכן מבנים 1","02050459":"תכן מבנים 2","02050460":"תכן מבנים 3","02050492":"מערכות הבניין - אקלים ואנרגיה","02050501":"מערכות הבניין - אור ותאורה","02050510":"בטיחות ונגישות במבנים וסביבתם","02050542":"אוריינות: מרחב וטקסט","02050543":"מבוא לגיאומטריה תיאורית","02050571":"כלכלת המרחב והבנייה","02050574":"פרויקט סטודיו 1","02050575":"פרויקט סטודיו 2","02050576":"פרויקט סטודיו 3","02050577":"פרויקט סטודיו 4","02050582":"סטודיו נושאי: כללי","02050583":"מקום לאמנות-מוזיאון ומרחבים אחרים","02050584":"אדריכלות ובריאות","02050585":"פרקטיקום-התנסות בפרקטיקה אדריכלית","02050586":"סטודיו נושאי כללי 2","02050587":"גבולות נזילים:עיצוב פיזי-דיגיטלי","02050598":"תחבורה והעיר:תכנון מכליל שכ',רחוב","02050599":"מבוא לבנייה מתועשת","02050622":"פרויקט מיוחד 3ג'","02050627":"עיצוב פנים וריהוט 2","02050638":"פרויקט מיוחד 3ד'","02050668":"סטודיו 4-עיצוב עירוני","02050688":"נושאים מיוחדים בארכיטקטורה","02050689":"נושאים מיוחדים בארכיטקטורה","02050690":"נושאים מיוחדים בארכי' 1א'","02050693":"נושאים מיוחדים בארכי' 2א'","02050703":"נושאים בתכנון כולל","02050704":"נושאים בתכנון כולל","02050720":"נושאים מיוחדים בארכיטקטורה 3ג'","02050723":"נושאים מיוחדים בארכיטקטורה 3ה","02050724":"נושאים מיוחדים בארכיטקטורה 3ו'","02050725":"נושאים מיוחדים בארכיטקטורה 3ז'","02050813":"הבעה גרפית","02050814":"רישום אדריכלי","02050818":"סדנאות מדיה 1ב'","02050819":"סדנאות מדיה 1ג'","02050822":"סדנאות מדיה 1 ו'","02050825":"סדנאות מדיה 2 ב'","02050826":"סדנאות מדיה 2 ג'","02050827":"סדנאות מדיה 2ד'","02050828":"סדנאות מדיה 2ה'","02050873":"עיצוב בסיסי 4","02050877":"עיצוב בסיסי 5","02050878":"עיצוב בסיסי 1 א'","02050885":"עיצוב בסיסי 3","02050886":"עיצוב בסיסי 2 א'","02050922":"התבוננות, דיגום ויצוג 1","02050923":"התבוננות, דיגום ויצוג 2","02060003":"נושאים נבחרים בארכיטקטורה - שימור 1","02060006":"נושאים נבחרים בארכיטקטורה - אדריכלות דיגיטלית 1","02060007":"נושאים נבחרים בארכיטקטורה - אדריכלות ירוקה 1","02060013":"סדנה טכנולוגית הנדסית 2","02060016":"נושאים נבחרים בארכיטקטורה - עיצוב וייצור ממוחשבים 3","02060019":"נושאים נבחרים באותנטיות בשימור: בין חומר לרוח","02060021":"נושאים בתקשורת סביבתית על המרחב","02060022":"נושאים נבחרים בארכיטקטורה: מחוללי בריאות ושלומות במרחב הבנוי","02060023":"נושאים נבחרים בתולדות האדריכלות: זמן עתיד - על האדריכלות, דמיון וזמן","02060024":"נושאים בארכ. מבוססת בנתוני בריאות","02060025":"נושאים נבחרים בארכיטקטורה 100","02060026":"נושאים נבחרים באתיקה מרחבית: היסטוריוגרפיה של תכנון בישראל","02060027":"נושאים נבחרים בסוגיות נבחרות בהיסטוריה עירונית וסביבתית","02060029":"נושאים נבחרים ביזמות עסקית 1","02060031":" נושאים נבחרים בשטחים פתוחים בישראל במערכת התכנון - סוגיות מרכזיות ואתגרים","02060032":"סדנא - נופי תרבות עפ\"י אונסק\"ו","02060033":"נושאים באדריכלות ועיצוב עירוני","02060034":"נושאים נבחרים בנתיב מורשת, שימור והתחדשות: פרשנות המורשת","02060044":"חומרי בניין ושיטות בנייה 2","02060061":"סטודיו נושאי מיוחד 1","02060073":"נושאים נבחרים בארכיטקטורה 7","02060096":"סוגיות באדריכלות: זיכרון והנצחה","02060100":"היבטים ביקורתיים במודרניזם האדרי","02060101":"אדריכלות חוקרת","02060170":"דיון ביקורתי בשיכון הצבורי בישראל","02060284":"עיצוב וקראפט דיגיטלי","02060403":"תשתיות עירוניות ומטרופוליניות","02060563":"סמינר בתכנון מבנים סולריים פאסיביים","02060566":"מיקרו אקלים בעיר בעזרת צמחייה","02060567":"מערכות הבניין - בקרת הסביבה","02060571":"מודלים ממוחשבים לתכנון ארכיטקטוני בר-קיימא","02060574":"שימוש מחדש במבנים קיימים","02060808":"תיאוריות של אדריכלות דיגיטלית","02060819":"סוגיות עכשוויות באוצרות מתקדם","02060821":"נושאים נבחרים בעיצוב תעשייתי 2","02060823":"נושאים נבחרים בעיצוב תעשייתי 4","02060824":"הנדסת אנוש וארגונומיה בעיצוב מוצר","02060825":"היסטוריה ותאוריה בעיצוב תעשייתי 2","02060827":"עיצוב, טכנולוגיה וחדשנות 1","02060829":"ענין של פרספקטיבה-קורס בין פקולטי","02060831":"נושאים נבחרים בעיצוב תעשייתי 5","02060835":"פרפורמליזם - ביצועים באדריכלות דיגיטאלית","02060836":"עיצוב תעשייתי בעידן המהפכה התעשייתית הדיגיטאלית","02060837":"עיצוב","02060838":"עיצוב במפגשי אדם, חיה, מכונה","02060839":"נ.נ בעיצוב תעשייתי: סריגה ממוחשבת","02060840":"שיטות ייצור מבוססות מחשב באדריכלות","02060841":"תכן פרמטרי באדריכלות","02060842":"מחקר פיתוח ועיצוב","02060843":"עיצוב עכשיו - סוגיות בעיצוב וטכנולוגיה במפנה המאה ה12","02060846":"טכנולוגיות משבשות בארכיטקטורה ועיצוב","02060847":"נושאים בעיצוב מערכות שירות ומוצר","02060911":"תכנון בעזרת מחשב 2","02060915":"נושאים נבחרים בארכיטקטורה 3","02060922":"הכרת צמחי בר לשילוב בגן הנוי","02060923":"נ.נ. בהיסטוריה של ארכ' ומדעי הרוח","02060924":"אדריכלות ותרבות בעידן הגרעיני","02060926":"תשתיות במרחב הפתוח","02060927":"אורבניזם עכשווי/עתידי בישראל","02060928":"התנגדות! אקטיביזם ומחאה במרחב","02060929":"כלים אנליטיים לתכנון אקלימי בבלוק העירוני","02060931":"גישות עכשוויות לעיצוב עירוני","02060932":"מעטפות חכמות: חזית החדשנות","02060933":"היער העירוני","02060936":"תכנון סביבות היברדיות","02060937":"איכות סביבה בתוך בניין","02060938":"סביבות חכמות","02060939":"תכנון מעטפות בניין בהנדסה הפוכה","02060941":"נושאים בביו-עיצוב לסביבה הבנויה","02060942":"נוש. ברבי-קומות בקיבוץ - מבט חדש","02060943":"נ.בעיצוב עירוני: עירוניות שיתופית","02060944":"\"תמ\"\"א אחת - כינוס, קודיפיקציה \"","02060946":"תרבות, חומר וטכנולוגיה","02060948":"היסטוריה ופילוסופיה של השימור","02060949":"נ.נ. העיר הקפיטליסטית ומדינת נדלן","02060952":"ההיסטוריה של המגורים","02060953":"\"מיכלולי-נוף בתמ\"\"א 53 בראי-אונסקו \"","02060955":"הארכיון והאתר","02060956":"נושאים בגישות ותפיסות בפוליטיקה","02060957":"נושאים בארכיטקטורה דיגיטלית","02060959":"נ.נ. בהיסטוריה טכנולוגית של הארכי","02060961":"נושאים באסטרטגיות להתחדשות עירוני","02060963":"תחיקת התכנון והבניה","02060964":"תהליכי תכנון ובניה","02060968":"טכנולוגיות בניה ופירטי בניין 3","02060971":"הבעה גרפית 2: שיטות ייצוג מתקדמות","02060972":"שינויי אקלים: מדע! מדיניות ותכנון","02060973":"כשארכיטקטורה פוגשת תאוריות מרחב","02060974":"תהליכי תכנון ופיתוח עירוני","02060977":"נושאים עיצוב אדריכלי והטבע","02060978":"\"נושא. במדמ\"\"ח: מבוא למדמ\"\"ח למעצבים \"","02060979":"נושאים נבחרים בעיצוב אדפטיבי","02060987":"נושאים נבחרים בשימור 3","02060992":"נושאים נבחרים בשימור 2","02060994":"פרוייקט מיוחד בשימור 2","02060995":"סיור.סדנא בינלאומית - אתרי מורשת","02070001":"תיאוריות התכנון","02070002":"תכנון חברתי","02070007":"הערכת שווי נדל\"ן","02070020":"מבוא לממ\"ג למתכננים","02070023":"מערכות מידע גיאוגרפי 2","02070041":"עקרונות אקולוגיים בתכנון עיר ואזור","02070045":"הכנה לתהליך מחקר","02070048":"תכנון סביבתי","02070070":"תכנון שימושי קרקע: עקרונות וכימות","02070342":"גיאוגרפיה עירונית ואזורית","02070407":"מדיניות סביבתית","02070456":"אקולוגיה עירונית","02070457":"היבטים תמטיים וכרונולוגיים באדריכלות נוף בישראל","02070462":"נושאים נבחרים באדריכלות נוף 1","02070466":"נושאים נבחרים באדריכלות נוף 5","02070469":"עיצוב אינטראקטיבי","02070600":"תכנון תחבורה מוטה אנשים","02070700":"אולפן 1: עירוני","02070701":"אולפן 2: שכונתי","02070806":"מבוא להיבטים משפטיים ומינהליים בתכנון","02070807":"תכנון ופיתוח בישובים ערביים בישראל","02070825":"יציבות מבנים","02070830":"תשתיות ירוקות","02070888":"נושאים בערים חכמות: מעשה ומחקר","02070889":"תכנית 2020 השפעתה על מערכת התכנון","02070901":"נושאים מתקדמים בתכנון ערים ואזורים 2","02070902":"נוש מתקדמים בתכנון ערים ואזורים 3","02070912":"נושאים נבחרים בתכנון ערים ואזורים 1","02070913":"נושאים נבחרים בתכנון ערים ואזורים 2","02070920":"שיטות מחקר איכותניות למתכננים","02070945":"תכנון וקיימות","02070953":"תכנון וניהול הסביבה החופית והימית","02080111":"סטודיו פרויקט גמר - חלק 1","02080112":"סטודיו פרויקט גמר - חלק 2","02080171":"פרויקט בסטודיו אינטגרטיבי","02080174":"פרוייקט בסטודיו עיצוב עירוני","02080310":"סטודיו עיצוב תעשייתי 1","02080314":"סטודיו בעיצוב תעשייתי 3","02080315":"סטודיו בעיצוב תעשייתי4","02080320":"סטודיו עיצוב תעשייתי 2","02080350":"חומרים תעשיתיים 1","02080353":"פרוייקט גמר בעיצוב תעשייתי","02080720":"נושאים נבחרים בארכיטקטורה ובינוי ערים","02080750":"היבטים נבחרים במחקר בארכיטקטורה ובנוי ערים","02080800":"סמינר בארכיטקטורה ובינוי ערים","02090003":"סמינר לדוקטורנטים בתכנון ערים","02090005":"התחדשות עירונית","02090040":"שיטות כמותיות בתכנון 2","02090050":"כלכלה עירונית","02090100":"סוציולוגיה למתכננים","02090450":"סמינר מתקדם בתכנון ערים 2","02090700":"אולפן 4: תכנון מטרופוליטני","02090970":"סמינר מחקר אישי","02130001":"בחינה בפיזיקה לפרחי הוראה","02130002":"בחינה בכימיה לפרחי הוראה","02130003":"בחינה במתמטיקה לפרחי  הוראה","02130004":"בחינה בביולוגיה לפרחי הוראה","02140011":"מבוא לחינוך למדע וטכנולוגיה 1","02140012":"מבוא לחינוך למדע וטכנולוגיה 2","02140091":"התנסות קלינית בהוראה ג'","02140092":"התנסות קלינית בהוראה א'","02140093":"התנסות קלינית בהוראה ב'","02140114":"חוק וערכים בחינוך","02140119":"למידה והור.מדעים והנ.בחינוך גבוה","02140120":"יסודות למידה והוראה","02140132":"דרכי הוראת מתמטיקה בחטיבת הביניים","02140137":"דרכי הוראת מתמ' לחט\"ע","02140213":"מבוא לתורת המספרים למורים","02140301":"דרכי הוראת הפיזיקה 1","02140302":"דרכי הוראת הפיזיקה 2","02140401":"דרכי הוראת כימיה 1","02140402":"דרכי הוראת כימיה 2","02140501":"דרכי הוראת ביולוגיה 1","02140502":"דרכי הוראת ביולוגיה 2","02140607":"דרכי הוראת מדע-טכנולוגיה בחט\"ב (ז-ט)","02140806":"דרכי הוראת תכן הנדסי","02140901":"דרכי הוראת מדעי המחשב 1","02140902":"דרכי הוראת מדעי המחשב 2","02160003":"מוח וחינוך - לקויות למידה בילדים","02160007":"פרויקט מעבדה בחקר המוח","02160011":"חינוך מדעי טכנולוגי בעידן דיגיטלי","02160014":"קשיי למידה במתמטיקה ומדעים","02160020":"דימות מוח - תיאוריה ופרקטיקה","02160022":"יזמות טכנולוגית בחינוך","02160028":"עיצוב משחקי למידה","02160030":"כריית נתונים בלמידה","02160031":"סוגיות מתקדמות בחינוך הנדסי","02160033":"שיטות מחקר כמותיות בסיסי","02160034":"הרשת כסביבה לימודית","02160035":"מבוא לאתיקת מכונות חכמות","02160038":"מחקר עיצוב בחינוך","02160110":"הוראת מדעים זיקה להוראת טכנולוגיה","02160117":"תקשורת המדע","02160125":"גישות מתקדמות להערכה בחינוך מתמטי","02160128":"שיטות הערכה בהוראת המדע","02160131":"חינוך בלתי פורמאלי במדע וטכנולוגיה","02160135":"סוגיות מתקדמות בהוראת המתמטיקה","02160136":"למידה באמצעות חקר מדעי","02160137":"למידה מבוססת פרויקטים","02160155":"בינה מלאכותית בחינוך למדע והנדסה","02160156":"מידול מתמטי בחינוך בהקשר מדעי","02180003":"רגשות, זהות והוגנות בלמידה","02180006":"שיח בכתת המתמטיקה והמדעים","02180007":"שיטות מחקר מתקדם בחינוך","02180103":"יסודות המחקר החינוכי","02180120":"תיאוריות למידה ותכנון לימודים","02180131":"פרויקט פיתוח תוכניות לימוד במדע וטכנולוגיה","02180134":"פרויקט בחינוך במדע וטכנולוגיה או ברפואה","02180147":"סמינר בעריכת פרוייקטים מחקריים","02180155":"סמינר במחקר חינוכי","02180156":"סמינר במחקר חינוכי","02180157":"סמינר במחקר חינוכי","02180218":"המדע מאחורי תקשורת המדע","02180322":"מחקר איכותני: היבטים תיאורטיים","02180324":"למידה ברשת תיאוריה ומעשה","02180329":"פיתוח והערכה- מיומנויות בינאישיות","02330000":"קורס הכנה למדעי המחשב","02340114":"מבוא למדעי המחשב מ'","02340117":"מבוא למדעי המחשב ח'","02340118":"ארגון ותכנות המחשב","02340123":"מערכות הפעלה","02340124":"מבוא לתכנות מערכות","02340125":"אלגוריתמים נומריים","02340128":"מבוא למחשב שפת פייתון","02340129":"מב.לתורת הקבוצות ואוטומטים למדמ\"ח","02340130":"מבוא למחשב שפת פייתון - בל","02340141":"קומבינטוריקה למדעי המחשב","02340218":"מבני נתונים 1","02340221":"מבוא למדעי המחשב נ'","02340230":"השתלמות עצמית 1","02340231":"השתלמות עצמית 2","02340247":"אלגוריתמים 1","02340268":"מבני נתונים ואלגוריתמים","02340290":"פרויקט 1 במדעי המחשב","02340291":"פרויקט 2 במדעי המחשב","02340292":"לוגיקה למדעי המחשב","02340302":"פרויקט בקומפילציה ה'","02340303":"פרויקט במערכות הפעלה ה'","02340311":"פרויקט שנתי בהנדסת תוכנה-שלב א'","02340312":"פרויקט שנתי בהנדסת תוכנה-שלב ב'","02340313":"פרויקט תעשייתי","02340326":"פרויקט בגרפיקה ממוחשבת ה'","02340329":"פרויקט בעיבוד וניתוח תמונות","02340493":"מבוא לאבטחת סייבר","02340901":"סדנה בתכנות תחרותי","02360001":"מבוא למחקר פקולטי במדעי המחשב","02360003":"אלגוריתמי ניהול לקבלת החלטות","02360004":"נושאים נבחרים בטרנספורמרים","02360005":"נושאים נבחרים במערכות הפעלה","02360006":"נושאים בבינה מלאכותית ורובוטיקה","02360007":"נושאים בלמידה לראייה ממוחשבת בתלת מימד","02360008":"נושאים בלמידה ביישומי אבטחת חומרה","02360009":"נושאים נבחרים בפיתוח גרעין לינוקס","02360010":"נושאים בסמינר לניהול נתונים אחראי","02360011":"נושאים באלגוריתמים לגרפים דינמיים","02360012":"נושאים במערכות מקביליות ומובזרות","02360013":"נושאים נבחרים במיטוב ביצועים מערכות","02360014":"נושאים מבוא ושימושים של גיאומטריה","02360016":"נושאים באלגוריתמים לאופטימיזציה","02360017":"נושאים מתקדמים בסיפוק אילוצים","02360018":"נושאים נבחרים בקבלת החלטות סדרתית","02360020":"נושאים נבחרים ברשתות חברתיות: אלגוריתמים ושימושיהם","02360021":"נושאים נבחרים באלגוריתמים מתיאוריה לפרקטיקה","02360022":"נושאים נבחרים בטכנולוגיות ענן","02360025":"אוטומטים, לוגיקה ומשחקים","02360026":"ידע ומשחקים במערכות מבוזרות","02360124":"נושאים נבחרים בהוכחות פורמליות","02360125":"פרויקט בלמידה ואבטחת מערכות מחשב","02360201":"מבוא לייצוג ועיבוד מידע","02360203":"נושאים בבינה מלאכותית שיתופית","02360204":"סמינר באימות פורמלי","02360206":"נושאים בסדרות וגרף דה ברוין","02360207":"נושאים על מודלי למידה עמוקה","02360216":"גרפיקה ממוחשבת 1","02360267":"מבנה מחשבים","02360271":"פיתוח מבוסס אנדרואיד","02360272":"פרויקט פיתוח מבוסס אנדרואיד","02360299":"מבוא לעיבוד שפות טבעיות","02360306":"גרפים מקריים","02360309":"מבוא לתורת הצפינה","02360313":"תורת הסיבוכיות","02360319":"שפות תכנות","02360322":"מערכות אחסון מידע","02360323":"פרויקט בעיבוד נתונים מ'","02360328":"פרוייקט בגרפיקה ממוחשבת מ'","02360329":"עיבוד ספרתי של גאומטריה","02360330":"מבוא לאופטימיזציה","02360331":"גדירות וחישוביות","02360332":"האינטרנט של הדברים - טכנולוגיות ויישומים","02360333":"פרויקט באינטרנט של הדברים","02360334":"מבוא לרשתות מחשבים","02360340":"פרויקט בתקשורת מחשבים","02360341":"תקשורת באינטרנט","02360342":"מבוא לאימות תוכנה","02360343":"תורת החישוביות","02360345":"אימות אוטומטי של מערכות תוכנה וחומרה","02360346":"פרויקט באימות תכניות בעזרת מחשב","02360347":"היסק אוטומטי וסינתזה של תוכנה","02360349":"פרויקט באבטחת מידע","02360350":"הגנה ברשתות","02360351":"מערכות מבוזרות","02360359":"אלגוריתמים 2","02360360":"תורת הקומפילציה","02360361":"פרויקט בקומפילציה מ'","02360363":"מסדי נתונים","02360366":"פרויקט במערכות הפעלה מ'","02360370":"תכנות מקבילי ומבוזר לעיבוד נתונים ולמידה חישובית","02360371":"פרויקט בתכנות מקבילי ומבוזר","02360374":"שיטות הסתברותיות ואלגוריתמים","02360376":"הנדסת מערכות הפעלה","02360377":"אלגוריתמים מבוזרים בגרפים","02360379":"קידוד ואלגוריתמים לזכרונות","02360388":"פרויקט במערכות אחסון","02360422":"טכנולוגיות ומערכות אחסון מתקדמות","02360490":"אבטחת מחשבים","02360491":"תכנות מאובטח","02360496":"הנדסה לאחור","02360499":"פרויקט בחומות אש","02360501":"מבוא לבינה מלאכותית","02360502":"פרויקט בבינה מלאכותית","02360503":"פרויקט תכנות מתקדם במדעי המחשב 1","02360504":"פרויקט המשך בתוכנה","02360506":"קריפטולוגיה מודרנית","02360509":"נושאים מתקדמים במבנה מחשבים","02360520":"קידוד במערכות אחסון-מידע","02360521":"אלגוריתמי קירוב","02360522":"אלגוריתמים בביולוגיה חישובית","02360523":"מבוא לביואינפורמטיקה","02360524":"פרוייקט בביואינפורמטיקה","02360601":"נושאים מתקדמים במדעי המחשב 1","02360608":"נושאים מתקדמים במדעי המחשב 8","02360613":"נושאים מתקדמים בקריפטולוגיה ה'","02360620":"נושאים מתקדמים באלגוריתמים ה'","02360621":"נושאים מתקדמים באלגוריתמים ה'+ת'","02360624":"נושאים מתקדמים בשיטות אימות פורמליות ה'","02360628":"נושאים מתקדמים בגרפיקה ממוחשבת ה'","02360629":"נושאים מתקדמים בגרפיקה ממוחשבת ה'+ת'","02360634":"נושאים מתקדמים ברשתות תקשורת מחשבים ה'","02360640":"נושאים מתקדמים באינפורמציה קוונטית ה'","02360641":"נושאים מתקדמים באינפורמציה קוונטית ה'+ת'","02360646":"נושאים מתקדמים בתאוריה של מדעי המחשב ה'","02360651":"נושאים מתקדמים בהנדסת תוכנה ה'+ת'","02360652":"נושאים מתקדמים באבטחת מידע ה'","02360664":"נושאים מתקדמים בחישוב ביולוגי ה'","02360667":"נו. במערכות לומדות והתנהגות אנושי","02360669":"נ. מתקדמים במבוא לבדיקת תכונות","02360700":"תיכון תוכנה","02360703":"תכנות מונחה עצמים","02360716":"מודלים גאומטריים במערכות תיב\"מ","02360719":"גאומטריה חישובית","02360729":"פרויקט בגיאומטריה חישובית","02360754":"פרויקט במערכות נבונות","02360755":"אלגוריתמים מבוזרים","02360756":"מבוא למערכות לומדות","02360757":"פרויקט במערכות לומדות","02360759":"מודלי דיפוזיה בלמידה עמוקה","02360766":"מבוא ללמידת מכונה","02360767":"אלגוריתמים לתכנון תנועה רובוטי","02360768":"פרויקט ברובוטיקה","02360779":"יסודות אלגוריתמיים למידע מאסיבי","02360780":"אלגוריתמים לניהול זיכרון דינמי","02360781":"למידה עמוקה על מאיצים חישוביים","02360801":"סמינר במדעי המחשב 1","02360802":"סמינר במדעי המחשב 2","02360803":"סמינר במדעי המחשב 3","02360804":"סמינר במדעי המחשב 4","02360805":"סמינר במדעי המחשב 5","02360813":"סמינר באלגוריתמים","02360819":"סמינר ברשתות תקשורת מחשבים","02360823":"סמינר בעיבוד אינפורמציה קוונטית","02360824":"סמינר ברובוטיקה","02360825":"סמינר באלגוריתמים מבוזרים","02360828":"פרויקט במערכות מחשבים","02360831":"סמינר בגאומטריה דיסקרטית","02360832":"סמינר בתכנות מקבילי","02360833":"סמינר באוטומטים ושפות פורמליות","02360834":"סמינר במערכות אחסון מידע","02360839":"סמינר במערכות לומדות וכשלונותיהן","02360860":"עיבוד תמונות דיגיטלי","02360861":"ראיה חישובית גאומטרית","02360873":"ראיה ממוחשבת","02360874":"פרויקט בראיה ממוחשבת","02360927":"מבוא לרובוטיקה","02360990":"מבוא לעיבוד אינפורמציה קוונטית","02370267":"מבנה מחשבים","02370343":"תורת החישוביות","02380125":"אלגוריתמים נומריים מ","02380739":"גאומטריה אלגוריתמית דיסקרטית","02740138":"שיטות כמותיות במדעי הרפואה א'","02740142":"שלישי קליני - להיות רופא 1","02740143":"שלישי קליני - להיות רופא 2","02740165":"גנטיקה כללית לרפואנים","02740166":"שיטות כמותיות במדעי הרפואה ב'","02740167":"ביולוגיה של התא","02740182":"ביוסטטיסטיקה","02740231":"ביואינפורמטיקה וגנומיקה ברפואה","02740234":"להיות רופא-חשיפה למקצוע הרפואה 3","02740235":"להיות רופא-חשיפה למקצוע הרפואה 4","02740241":"ביוכימיה כללית","02740242":"גנטיקה של האדם","02740243":"ביולוגיה מולקולרית ומנגנוני בקרה","02740246":"הבסיס המולקולרי של מחלת הסרטן","02740251":"אבולוציה","02740252":"פתוגנים אאוקריוטים","02740253":"פיזיולוגיה תאית","02740257":"אנטומיה א'","02740258":"פסיכולוגיה בעולם הרפואה","02740260":"היסטולוגיה","02740261":"אימונולוגיה בסיסית וקלינית","02740262":"אמבריולוגיה בסיסית ורפואית","02740265":"התנסות במחקר בסיסי וקליני","02740266":"אנטומיה ב'","02740267":"פתולוגיה כללית","02740268":"ביוכימיה קלינית","02740318":"אפידמיולוגיה","02740319":"וירולוגיה","02740320":"אתיקה ומשפט רפואי","02740322":"פתולוגיה מערכתית 1","02740323":"פיסיולוגיה 1 - נשימה לב ודם","02740326":"להיות רופא-סוגיות תרבותיות ואתיות ברפואה (5)","02740327":"להיות רופא-סוגיות תרבותיות ואתיות ברפואה (6)","02740328":"אנדוקרינולוגיה פיסיולוגיה ופתופיזיולוגיה","02740336":"נוירופזיולוגיה מערכתית","02740348":"פיסיולוגיה 2 - מערכות ויסות","02740352":"מבוא לתזונה קלינית","02740367":"פרמקולוגיה בסיסית","02740368":"פתולוגיה כללית","02740369":"המטולוגיה,ממדע בסיסי למיטת החולה","02740372":"בקטריולוגיה","02740375":"נוירואנטומיה","02750109":"רוח חדשה לחסרי מעמד 1","02750110":"רוח חדשה לחסרי מעמד 2","02750111":"רפואה בעין המצלמה","02750112":"אבולוציה של האדם","02750113":"עולם התלת ממד בתחום הרפואה","02750200":"תולדות הרפואה","02750213":"חוג הסרטן - מגנום לתרופה","02750214":"כלכלת בריאות","02750215":"עניין של רפואה ומוות","02750216":"יסודות המחקר והכתיבה המדעית","02750217":"פרויקט מחקר בסיסי:בדרך לרופא-חוקר","02750304":"טלמדיסין-רפואה בעידן הדיגיטלי","02750310":"אודיולוגיה 1","02750315":"התמודדות הרופאים עם אלימות במשפחה","02750316":"שואה ורפואה-לימוד השואה ולקחיה","02750317":"ספרות ורפואה","02750320":"מבוא למחקר מדעי ברפואה","02760001":"רפואת שינה מפיזיולוגיה ועד מחלות","02760004":"יזמות ופיתוח טכנולוגיות רפואיות","02760005":"מבוא להלת'טק: רפואה ותעשייה","02760201":"חוג הסרטן - מגנום לתרופה","02760307":"פיסיולוגיה של על-לחץ וצלילה","02760413":"אימונולוגיה בסיסית","02760419":"מנגנונים  מולקולרים של דלקת","02760431":"רדיקלים חופשיים בביולוגיה ורפואה","02760450":"אנדוקרינולוגיה","02770210":"בריאות הציבור ומערכת הרפואה בארץ","02770300":"נוירואנטומיה פונקציונאלית","02770301":"מנגנוני עיבד כאב כמודל למחקר","02780005":"פרקים באימונולוגיה מודרנית","02780023":"בקרת הביטוי הגנטי מחיידק לאדם","02780029":"סוגיות עכשוויות באימונולוגיה","02780031":"מיקרוסקופיה מעשית","02780301":"עבודה סמינריונית בפיסיולוגיה","02780306":"עקרונות בניסויים הומניים בבעלי חיים","02780401":"רצפטורים לנוירוטרנסמיטרים במוח","02780411":"אמבריולוגיה","02780415":"סמינר באימונולוגיה 1","02780416":"סמינר באימונולוגיה 2","02780418":"פרמקולוגיה מולקולרית","02780430":"נושאים מתקדמים במערכות מעוררות","02780464":"סמינר- נושאים נבחרים בגנטיקה רפואית","02780465":"ייעוץ גנטי לממצאים חריגים בבדיקות עלשמע של העובר","02780466":"מבוא אינטגרטיבי למיומנויות בייעוץ גנטי קליני ומעבדתי","02780467":"סמינריון מחקר בגנטיקה רפואית 1","02780468":"סמינריון מחקר בגנטיקה רפואית 2","02780469":"ייעוץ גנטי קליני ומעבדתי 1","02780470":"ייעוץ גנטי קליני ומעבדתי 2","02780471":"עקרונות וישומים של מיון תאים על בסיס צבע פלואורסצנטי","02780472":"קרישת הדם- מנגנונים והשפעה מורחבת על תחומים נוספים","02780476":"טכנולוגיות גנומיות מתקדמות","02780479":"מודלים התנהגותיים במחקר פסיכוביולוגי","02780483":"נושאים בגנטיקה של האדם","02780497":"קורס ליבה במדעי המח","02780498":"תאי גזע, רגנרציה ויצירת איברים","02780499":"נושאים נבחרים בביולוגיה התפתחותית","02780501":"ביולוגיה התפתחותית","02780507":"ביוסטטיסטיקה וניתוח נתונים","02780949":"וירולוגיה","02780950":"מיקרוסקופ אלקטרונים במחקר ביולוגי","02780952":"אותות סידן בתאים","02780953":"נושאים עדכניים במדעי הרפואה","02780956":"חשיבה פילוסופית למדענים","02780957":"אתיקה ומשפט רפואי","02780958":"מבוא למטבולומיקה","02780959":"נושאים מתקדמים בביולוגיה חישובית","02780960":"בינה מלאכותית ככלי עזר בשלבי מחקר","02780961":"מבוא לנוירוביולוגיה","02780962":"נושאים בביולוגיה התפתחותית 2","02780963":"שיטות אנליזה מתקדמות למידע ביו-רפואי","03140003":"מבוא למכניקת המוצקים","03140006":"אפיון מבנה והרכב חומרים","03140009":"מעבדה בחומרים הנדסיים ח'","03140011":"מבנה ותכונות של חומרים הנדסיים","03140014":"חומרים ביו-רפואיים","03140016":"גרפיקה ממוחשבת להנדסת חומרים","03140100":"עקרונות ודרכי למידה בהנ. חומרים","03140125":"נושאים מתקדמים בהנדסת חומרים 3","03140126":"נושאים מתקדמים בהנדסת חומרים 2","03140150":"פיזיקה של מצב מוצק","03140200":"מבוא להנ.חומרים לתעופה וחלל","03140309":"תהליכי ייצור ועיבוד חומרים","03140311":"חומרים קרמיים ורפרקטורים","03140312":"מבוא לחומרים פולימריים","03140316":"תהליכי חיבור של חומרים","03140532":"אלקטרוכימיה, קורוזיה ושיטות הגנה","03140533":"מבוא להנדסת חומרים מ'1","03140535":"מבוא להנדסת חומרים","03140536":"מבוא להנדסת חומרים א","03150001":"מעבדת חומרים מתקדמת 1ח'","03150002":"מעבדת חומרים מתקדמת 2ח'","03150003":"תרמודינמיקה של חומרים","03150008":"התנהגות מכנית של חומרים","03150012":"בחירת חומרים מתקדמת","03150014":"פרויקט מתקדם בחומרים","03150016":"התקני מוליכים למחצה להנדסת חומרים","03150017":"תהליכי גימור וציפויים","03150018":"חומרים בהנדסה ביורפואית","03150025":"פרויקט מתקדם בחומרים 2","03150030":"תכונות חומרים אלקטרונים","03150035":"פרויקט בחירה בהנדסת חומרים","03150037":"תכונות ושימושים של חומרים מתכתיים","03150039":"מעבר תנע, חום ומסה להנדסת חומרים","03150040":"מבוא למדע הזכוכית","03150041":"תופעות אופטיות בחומרים","03150042":"מבוא לננומדע וננוטכנולוגיה","03150044":"חומרים אופטיים","03150045":"תהליכי יצור במיקרואלקטרוניקה","03150046":"מבוא לאריזות לרכיבי ולסי מתקדמות","03150048":"ביומינרליזציה וחומרים ביולוגיים","03150049":"ביומינרליזציה וחומרים ביולוגיים","03150051":"דיפוזיה במוצקים","03150052":"קינטיקת טרנספורמציות בחומרים","03150057":"מבוא למדע חישובי של חומרים","03150058":"שיטות לניתוח חומרים באמצעות מחשב","03150059":"חומרים פונקציונלים-תכונות והתקנים","03150060":"יסודות האפיטקסיה: מבנה פני השטח","03150061":"התקנים אלקטרוניים דו-ממדיים","03150062":"מבוא למכניקה של חומרים רכים","03150200":"מכנ. רשתות פולימר.בחומרים ביולוג'","03150202":"נקודות קוונטיות קולואידיות","03150242":"הנדסת חומרים מרוכבים","03160000":"מבנה והתנהגות של פולימרים","03160001":"מבוא למכניקה של חומרים רכים","03160240":"יסודות הקריסטלוגרפיה","03160241":"יסודות הקריסטלוגרפיה ת","03180020":"אלקטרוניקה מולקולרית ניסיונית","03180021":"חומרים בתנאי לחץ וטמפרטורה גבוהים","03180101":"פולימרים פורוזיביים","03180119":"סמינר מתקדם בהנדסת חומרים","03180124":"נושאים מתקדמים בהנדסת חומרים","03180126":"נושאים מתקדמים בהנדסת חומרים 2","03180127":"נושאים מתקדמים בהנדסת חומרים 3","03180128":"נושאים מתקדמים בהנדסת חומרים4","03180129":"נושאים מתקדמים בהנדסת חומרים1","03180221":"מבנה והרכב פני שטח מוצקים","03180222":"אפיון ומודיפיקציה של פני שטחים","03180319":"היסודות הפיזיקליים של התפתחות מיקרומבנה","03180520":"הנדסת חומרים לאלקטרוניקה אורגנית","03180525":"מיקרוסקופית אלקטרונים חודרת","03180526":"דיפרקצית קרני-איקס","03180529":"מיקרוסקופית אלקטרונים סורקת אנליטית","03180530":"תרמודינמיקה ומכניקה של פולימרים","03180532":"מעבר מטען וחום בחומרים","03180541":"יסודות של מיקרוסקופיה סורקת בשדה קרוב","03180724":"תערובות פולימרים: מבנה ותכונות","03180819":"תהליכי קורוזיה במבחר חומרים","03180820":"מערכות אלקטרוכימיות עתירות אנרגיה","03200029":"נקודות בחירה חופשיות 1,5","03200096":"חוק ומידול פיסיקלי 2","03200098":"יסוד. מדע אינטגרטיבי-מרחב,סימטריה","03200200":"מעבדת מחקר כללית","03210001":"קורס בסין 2","03210002":"קורס בסין 3","03210003":"קורס בסין 4","03210004":"קורס בסין 5","03210005":"קורס בסין 6","03210006":"קורס בסין 6","03210007":"חינוך לביטחון לאומי","03210008":"מבוא קהילת האומה הסינית","03230032":"פילוסופיה של בינה מלאכותית","03230033":"המוח המוסיקלי מאות ועד תפיסה","03240032":"אנגלית למתקדמים א'","03240033":"אנגלית טכנית-מתקדמים ב'","03240052":"עברית 2","03240053":"עברית 4","03240065":"עברית 1","03240069":"עברית 2","03240070":"עברית לביה\"ס הבינלאומי 44","03240227":"אלתור ג'אז למתחילים","03240228":"נגינה ואלתור בהרכב ג'אז-למתקדמים","03240235":"תקשורת בין-אישית באמצעי תיאטרון","03240236":"תזמורת נשיפה","03240250":"עיצוב גרפי ותקשורת חזותית","03240251":"עברית כשפה זרה למתחילים","03240258":"מבוא להאזנה מודרכת-ענקי התזמורת","03240261":"אחריות מקצועית:דילמות חוק ואתיקה","03240262":"תולדות הפילוסופיה והמדע בעת החדשה","03240265":"אקו-פילוסופיה:חשיבה סביבתית","03240266":"מדע וביקורות המדע","03240267":"יחסי גוף נפש:מאפלטון ועד מדעי המח","03240269":"אתיקה בפעולה","03240273":"טכנולוגיה וחברה:אתגרים אתיים","03240274":"מבוא להאזנה מודרכת-ענקי הפסנתר","03240282":"פוליטיקה של זהויות בישראל","03240283":"כלכלה וחברה: מבט בין-תרבותי","03240284":"חינוך בסין ובישראל","03240286":"האדם והטבע בפילוסופיה מערבית","03240288":"מוסיקה טכנולוגית","03240292":"משפט שוויון וצדק חברתי","03240293":"תובנות יסוד בפילוסופיה של הרמב\"ם","03240298":"מן התנ\"ך ועד למשפט הישראלי החדשני","03240299":"טרור, ג'יהד ותגובה מדינית","03240305":"היסטוריה של המדע","03240306":"הגנום האנושי-אתיקה, משפט וחברה","03240307":"צוהר לספרות המדרש והאגדה","03240314":"היסטוריה של המדע: המאה ה-20 ומעבר","03240315":"מיקרובים ואנחנו:רפואה,חקלאות,סביבה","03240329":"פילוסופיה של המדע 1","03240385":"תקשורת בעל-פה ובכתב באנגלית","03240395":"מדע טכנולוגיה ומוסר","03240397":"סוגיות בפילוסופיה של מדעי החיים-לרפואנים בלבד","03240432":"פסיכולוגיה של המוזיקה","03240436":"עולמות מוסיקליים","03240439":"יסודות באמנות יפן","03240441":"פרקים נבחרים בתולדות האמנות","03240442":"משפט העבודה בישראל","03240445":"הסתגלות למצבי לחץ","03240446":"מבוא להיסטוריה של מוזיקת הג'ז","03240452":"מעקב:טכנולוגיה, תיאוריה ואתיקה","03240453":"אהבה וחוק בעידן הטכנולוגי","03240454":"מבוא לפילוסופיה של המדע","03240460":"מחשבה מדינית יהודית עד העת החדשה","03240463":"היסטוריה של המזרח התיכון","03240473":"מבנה חדשנות מדעית ושינוי פרדיגמה","03240474":"אתיקה: יסודות, נורמה ויישום","03240478":"תכנון וניהול קריירה","03240481":"רישום למתחילים","03240482":"רישום ביד חופשית למתקדמים","03240483":"ציור למתחילים","03240490":"כתיבה אקדמית לתואר ראשון","03240495":"ציור מתקדם","03240513":"מחזה-הצגה-מופע","03240518":"חדשנות, יצירתיות ואושר","03240520":"יזמות עסקית","03240521":"יזמות בארגונים-התפתחויות ומגמות","03240527":"יסודות היזמות","03240528":"מנהיגות יזמית","03240536":"הייטק בישראל: כיצד להוביל עולמית","03240539":"מחקרי שוק","03240540":"היבטים משפטיים ביזמות עסקית","03240541":"גיוס המערכת האקולוגית העסקית","03240567":"סדנת צילום: שפה וכלים","03240580":"יפנית 2","03240600":"גרמנית 1","03240602":"יפנית למתחילים","03240603":"גרמנית 2","03240609":"צרפתית 11","03240611":"צרפתית 22","03240621":"רוסית למתחילים 1","03240626":"ערבית (כשפה זרה) 1","03240627":"ערבית (כשפה זרה) 2","03240628":"ערבית מדוברת","03240630":"איטלקית למתחילים 1","03240631":"איטלקית למתקדמים","03240675":"ספרדית למתחילים","03240679":"ספרדית ברמה בינונית","03240685":"שיחה באנגלית למתקדמים","03240692":"סינית למתחילים","03240694":"סינית למתקדמים","03240697":"עקרונות מעשיים לעיבוד תמונה","03240879":"סוגיות נבחרות בחברה הישראלית-מרכז בינ\"ל","03240881":"פרקים נבחרים בתולדות ישראל","03240908":"תולדות הצילום:מהלשכה האפלה לסמרטפון","03240962":"מבוא לפסיכולוגיה","03240987":"הסטוריה של פיסיקה מודרנית","03240992":"סוגיות אתיות במרחב האישי והציבורי","03250001":"סטודיו אומן בקמפוס 1","03250002":"סטודיו אומן בקמפוס 2","03250005":"יזמות מפי היזמים","03250006":"מבוא לארכיאולוגיה במאה ה-21","03250008":"מבוא ליזמות והון סיכון","03250009":"להשאיר חותם במדע ובאמנות","03250010":"מדע דת ופילוסופיה","03250011":"סטודיו אומן בקמפוס 3","03250012":"סטודיו אומן בקמפוס 4","03250013":"סטודיו אומן בקמפוס 5","03250015":"נושאים נבחרים בהיסטוריה 1","03250016":"נושאים נבחרים בהיסטוריה 2","03250017":"נושאים נבחרים בהיסטוריה 3","03250019":"נושאים נבחרים באתיקה 1","03250020":"נושאים נבחרים באתיקה 2","03250021":"נושאים נבחרים במדעי הרוח 1","03250022":"נושאים נבחרים במדעי הרוח 2","03250024":"אתיקה רפואית וביואתיקה ישראלית","03250025":"מבוא להאזנה מודרכת:מוסיקה ווקאלית","03250027":"שיחה באיטלקית למתחילים","03250029":"מיומ' בינה מלאכותית בקשורת דיגיטל","03260000":"פרקים בהיסטוריה ופילוסופיה מראשית המחשוב ועד לאינטרנט","03260001":"סוגיות נבח. בהיסט. ופילו. של המדע: על מנגנונים ושימוש","03260002":"אתיקה של טכנולוגיות חדשניות","03260004":"פילוסופיה של זמן ומרחב","03260005":"פריצות דרך בתולדות החשיבה המתמטית","03260006":"תורת הקוואנטים: מבט פילוסופי","03260008":"תרבות המערב: ספרי יסוד","03260009":"תיאוריות אנתרופולוגיות","03260013":"נושאים נבחרים בלימודים הומניסטיים","03280013":"אנגלית מורחבת לתארים מתקדמים","03280014":"העשרה אנגלית תארים מתקדמים","03280015":"תקשורת מדעית ומקצועית","03280016":"כתיבה אקדמית לדוקטורנטים","03280017":"כתיבה אקדמית למגיסטרנטים","03280049":"כתיבה אקדמית באנגלית למסטרנטים","03280050":"כתיבה אקדמית באנגלית לדוקטורנטים","03290000":"סמינר פילוסופי: טכנולוגיה הומניסט","03340009":"מכניקת זורמים ביולוגיים","03340011":"יסודות תכן ביו-חשמלי","03340014":"פרויקט בהנדסה ביו-רפואית 1","03340019":"מעבדה מתקדמת בהנדסה ביו-רפואית 1","03340020":"מעבדה מתקדמת בהנ. ביו-רפואית 2","03340021":"מגמות בהנדסה ביו-רפואית","03340023":"מבוא לסטטיסטיקה להנ. ביו-רפואית","03340221":"יסודות של חומרים רפואיים","03340222":"מכניקת מוצקים","03340274":"מבוא לאנטומיה של האדם","03340305":"פרויקט מחקרי לסטודנטים מצטיינים","03340331":"מפגשים עם התעשיה הביו-רפואית","03350001":"מעבדה בהנדסה ביו-רפואית 1","03350002":"מעבדה בהנדסה ביו-רפואית 2","03350003":"מעבדה בהנדסה ביו-רפואית 3","03350005":"מעבדה בהנ. ביו-רפואית 1 לפיזיקאים","03350010":"תכן ביומכני בסיסי","03350015":"פרויקט בהנדסה ביו-רפואית 2","03350016":"פרויקט קליני-הנדסי","03360001":"רגולציה ומחקר קליני במכשור רפואי","03360014":"נושאים מתקדמים בהנדסה ביורפואית 1","03360016":"נושאים מתקדמים בהנדסה ביורפואית 2","03360017":"נושאים מתקדמים בהנדסה ביו רפואית 3","03360020":"תופעות ביו-חשמליות","03360021":"ננו-חלקיקים בביולוגיה, מכניקה וריאולוגיה","03360022":"מתא לרקמה","03360023":"יישומי אופטיקה בביורפואה","03360024":"חדשנות רפואית במודל ביודזיין 1","03360025":"חדשנות רפואית במודל ביודזיין 2","03360026":"מחקרים עדכניים בהנדסה ביו רפואית","03360027":"עיבוד תמונות רפואיות (עתר)","03360028":"יישומי למידה עמוקה בדימות תהודה","03360032":"נושאים נבחרים בהדמיה מולקולרית","03360033":"נושאים נבחרים בלמידה עמוקה לניתוח תמונות רפואיות","03360034":"נ.נ. בתכנון מעגלים ביו-אלקטרונים","03360035":"נושאים נבחרים בביו-הדפסה בתלת ממד: עקרונות ויישומים","03360036":"נושאים נבחרים בניתוח תנועה בבני אדם מתקדם מקליניקה ועד ספורט","03360100":"פיזיולוגית מערכות הגוף למהנדסים","03360207":"עיבוד תמונות רפואיות","03360208":"שיטות באנליזה של אותות ביולוגיים","03360209":"למידה עמוקה לאותות פיזיולוגיים","03360325":"אולטרסאונד ברפואה - עקרונות וישומם","03360326":"נתוח נתונים ושערוך פרמטרים בהנדסה ביו רפואית","03360402":"שיטות תכנון ביו-חומרים בביו-רפואה","03360404":"ביו-חומרים לממשקים ביואלקטרוניים","03360405":"יסודות הנדסיים בביולוגיה וביוטכנולוגיה","03360502":"עקרונות הדמיה ברפואה","03360504":"עקרונות דימות תהודה מגנטית","03360506":"ביומכניקה שיקומית","03360517":"ביו הנדסה של התא","03360520":"שתלים אורתופדיים ותחליפי רקמה","03360521":"עקרונות הנדסיים של המערכת הקרדיווסקולרית","03360522":"מבוא לבקרה במערכות ביו-רפואיות","03360529":"הנדסת רקמות ותחליפים ביולוגיים","03360533":"יסודות אופטיקה ופוטוניקה ביו-רפואית","03360537":"ביופיסיקה ונוירופיסיולוגיה למהנדסים","03360538":"עקרונות ביוהנדסיים לחישת מולקולות","03360539":"זרימה במערכת הנשימה ומתן תרופות בשאיפה","03360540":"תכן מיכשור רפואי ממוחשב","03360541":"זרימה במערכות הקרדיווסקולרית וסירקולציה של הדם","03360543":"יזמות - - מרעיון למוצר","03360544":"תכן ומימוש של מעגלים גנטיים","03360545":"הפיזיקה של הרפואה הגרעינית והרדיותרפיה","03360546":"מערכות לומדות בתחום הבריאות","03360547":"דימות אופטי חישובי בהנדסה ביו-רפואית","03360548":"מעבדה לתכן מעגלים גנטיים","03360549":"טכניקות ריצוף ד.נ.א. מסנגר עד ננו-חרירים","03360550":"ביופיזיקה חישובית","03370001":"ביופיסיקה ונוירופיסיקה למהנדסים","03370002":"פיזיולוגית מערכות הגוף למהנדסים","03370004":"אנטומיה למהנדסים","03380001":"בקרת ביואנרגטיקה תאית","03380002":"מרעיון קליני לפתרון בהנדסה ביו רפואית","03380003":"שיטות מתקדמות לטיפול בסרטן","03380017":"נושאים מתקדמים בהנדסה ביו-רפואית 8","03380019":"נושאים מתקדמים בהנדסה ביו-רפואית 9","03380028":"למידה עמוקה בדימות תהודה מגנטית","03380319":"פרוייקט מתקדם בהנדסה רפואית","03380402":"ביומכניקה של מערכת הדם","03380500":"סמינר מתקדם בהנדסה רפואית וביולוגית","03380515":"הצימוד החשמלי-מכני בשרירי הלב והשלד","03380535":"מיקרוסקופיה אופטית ביו-רפואית","03940580":"יסודות ניצוח תזמורת","03940582":"תזמורת","03940587":"מקהלה 3","03940591":"פיתוח קול 2","03940800":"חינוך גופני - כושר בנים","03940801":"חינוך גופני - התעמלות כללית בנות","03940802":"חינוך גופני - שחיה","03940803":"חינוך גופני - משחקי כדור","03940804":"חינוך גופני - משחקי מחבט","03940805":"חינוך גופני - אתלטיקה קלה","03940806":"חינוך גופני - הגנה עצמית","03940807":"כושר גופני מעורב","03940808":"חינוך גופני-מיועד לסטודנטים חדשים","03940820":"חינוך גופני - תנועה ומחול","03940900":"קורסי חינוך גופני","03940902":"נבחרות ספורט","06180033":"פרוייקטי התמחות","06180035":"יזמות ומימון חלופי בכלכלות","06180047":"מדע נתונים גרפים עבור מערכות","06180048":"חומרה ומערכות עבור למידת מכונה","06180050":"למידת מכונה בתחום הבריאות הדיגיטל","06180051":"נתונים, אנשים ומערכות","06180052":"ערים חכמות","06180053":"בינה מלאכותית עבור תחום הבריאות","06180054":"סטודיו ממשק אדם-מכונה","06180056":"מחקר בחווית משתמש","06180060":"עיבוד שפה טבעית ולמידת מכונה","06180061":"מער. עירוניות ומער. אספקת אנרגיה","06180063":"יישומים מעשיים במכונות לומדות","06180064":"ייצור ספרתי","06180066":"חוק ומשפט בתחום הבריאות הספרתית","06180069":"ניהול טכנולוגיות","06180071":"הפן העסקי של המשחקנות","06180073":"בניה והובלה של צוותי מיזמים חדשים","06180074":"הבאה למוצר של  מכונות לומדות","06180075":"טכנולוגיות ושווקים מתעוררים","06480001":"סמינר בננומדעים וננוטכנולוגיה","06480011":"יסודות הביוננוטכנולוגיה","07380001":"פרויקט במערכות אוטונומיות","07480000":"נושאים נבחרים בהנדסת מערכות 2","07480001":"מדיניות ואסטרטגיה של ניהול מו\"פ","07480004":"הנדסת מערכות דיגיטליות","08580120":"סמינר מתקדם בהנדסת פולימרים","08580121":"ריאולוגית פולימרים","51060003":"טכנולוגיות מימן","51060005":"מבוא לאנרגיה נקיה 2: התקני אנרגיה","51060006":"מבוא להפקת אנרגית רוח","51060007":"מבוא לאנרגיה גרעינית","51080002":"סמינר באתגרים לאומיים וגלובליים באנרגיה","51080003":"כלכלה וניהול של מערכות אנרגיה","52080001":"מבוא להנדסה ימית","61070006":"היבטים פסיכולוגים וחברתיים של מדיה מקושרת","61070007":"רשתות","61070009":"תכנון, יצור אב-טיפוס והערכת ממשק","61070016":"מושגי פרטיות ובטיחות בעולם הגדול","61070027":"מערכות הזנק - תכנון והנדסה","61070028":"מערכות לומדות","61070029":"מבוא לראיה ממוחשבת","61070044":"ניצול מסדי נתונים בעולם הגדול","61070046":"פרטיות בעידן הדיגיטלי","61070049":"ניהול מוצר","61070050":"מחקר עצמאי - א","61070051":"מחקר עצמאי - ב","61070053":"פרוייקט - אתגרי חברות","61070054":"פרוייקט - סטודיו סטארט אפ","61070056":"מחקר עצמאי 2","61070062":"שימושיות וחקר חוית המשתמש","61070070":"חשיבה עיצובית","61070610":"עובוד שפות טבעיות","61080000":"שווקים ורשתות","61080007":"חשיבה מחדש של העיר","61080012":"אסטרטגיות עירוניות וחקר מקרים","61080016":"אומנות דיגיטלית","61080017":"סמינריון מחקרי: חיים דיגיטליים","61080019":"בניית תעוזה יזמית","61080089":"טכנולוגיה, תקשורת ודמוקרטיה","61080091":"סטודיו על חברות גדולות","61080093":"בלוקצ'יין, מטבע מבוזר וחוזים חכמים","61080095":"מציאות מעורבבת","61080103":"מחשוב מקיף","61080106":"מיישמים ראשונים","61080108":"משפטים ללא-משפטנים","61080109":"מערכות אוטונומיות חכמות","61080113":"קבלת החלטות ניהוליות","61080114":"מכירות ופיתוח עיסקי","61080117":"מודלים עסקיים","61080118":"ערכים בטכנולוגיות ספרתיות","97030013":"מתמטיקה מכינה בינלאומי","97030014":"פיזיקה מכינה בינלאומי","97030015":"עברית מכינה בינלאומי"};
        // technion-course-names_end
        /* eslint-enable */
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
        return dict[course] || dictExtra[course] || null;
    }
})();
