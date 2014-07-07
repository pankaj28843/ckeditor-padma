(function() {
    CKEDITOR.plugins.add('padma', {
        requires: 'clipboard',
        lang: 'en',
        icons: 'padma,padma-rtl',
        hidpi: true,
        init: function(editor) {
            var commandName = 'padma',
                // Flag indicate this command is actually been asked instead of a generic pasting.
                forceFromWordUsingPadma = 0,
                path = this.path;

            editor.addCommand(commandName, {
                // Snapshots are done manually by editable.insertXXX methods.
                canUndo: false,
                async: true,

                exec: function(editor) {
                    var cmd = this;

                    forceFromWordUsingPadma = 1;
                    // Force html mode for incomming paste events sequence.
                    editor.once('beforePaste', forceHtmlMode);

                    editor.getClipboardData({
                        title: editor.lang.padma.title
                    }, function(data) {
                        // Do not use editor#paste, because it would start from beforePaste event.
                        data && editor.fire('pastePadma', {
                            type: 'html',
                            dataValue: data.dataValue
                        });

                        editor.fire('afterCommandExec', {
                            name: commandName,
                            command: cmd,
                            returnValue: !! data
                        });
                    });
                }
            });

            // Register the toolbar button.
            editor.ui.addButton && editor.ui.addButton('Padma', {
                label: editor.lang.padma.toolbar,
                command: commandName,
                toolbar: 'clipboard,50'
            });

            editor.on('pasteState', function(evt) {
                editor.getCommand(commandName).setState(evt.data);
            });

            // Features bring by this command beside the normal process:
            // 1. No more bothering of user about the clean-up.
            // 2. Perform the clean-up even if content is not from MS-Word.
            // (e.g. from a MS-Word similar application.)
            // 3. Listen with high priority (3), so clean up is done before content
            // type sniffing (priority = 6).
            editor.on('pastePadma', function(evt) {
                var data = evt.data,
                    mswordHtml = data.dataValue;

                // MS-WORD format sniffing.
                if (mswordHtml && (forceFromWordUsingPadma || (/(class=\"?Mso|style=\"[^\"]*\bmso\-|w:WordDocument)/).test(mswordHtml))) {
                    // If filter rules aren't loaded then cancel 'paste' event,
                    // load them and when they'll get loaded fire new paste event
                    // for which data will be filtered in second execution of
                    // this listener.
                    var isLazyLoad = loadFilterRules(editor, path, function() {
                        // Event continuation with the original data.
                        if (isLazyLoad)
                            editor.fire('pastePadma', data);
                        else if (!editor.config.pasteFromWordUsingPadmaPromptCleanup || (forceFromWordUsingPadma || confirm(editor.lang.padma.confirmCleanup)))
                            data.dataValue = CKEDITOR.cleanPadma(mswordHtml, editor);
                    });

                    // The cleanup rules are to be loaded, we should just cancel
                    // this event.
                    if (isLazyLoad) {
                        evt.cancel();
                    } else {
                        editor.fire('paste', data);
                    };
                }
            }, null, null, 3);

            function resetFromWordUsingPadma(evt) {
                evt && evt.removeListener();
                editor.removeListener('beforePaste', forceHtmlMode);
                forceFromWordUsingPadma && setTimeout(function() {
                    forceFromWordUsingPadma = 0;
                }, 0);
            }
        }

    });

    function loadFilterRules(editor, path, callback) {
        var isLoaded = CKEDITOR.cleanPadma;

        if (isLoaded)
            callback();
        else {
            var filterFilePath = CKEDITOR.getUrl(path + 'filter/default.js');

            // Load with busy indicator.
            CKEDITOR.scriptLoader.load(filterFilePath, callback, null, true);
        }

        return !isLoaded;
    }

    function forceHtmlMode(evt) {
        evt.data.type = 'html';
    }
})();