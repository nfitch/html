/*
  Want to bind some number of keyboard shortcuts to functions called on
  downstream objects (some, maybe even this!).

  Want to generate a help element that can also be used to remap keys (but maybe
  we'll leave the custom key remapping for another time (?).

  Key commands have no other context coming in *except* the commands themselves,
  so the only input to this is keyboard events.

  We have key groupings only so that we can automagically collect them into...
  groups...
 */
function createKeyHandler(lists) {
    var DEBUG = false;
    var fnbindings = {};
    //Per docs, Maps are ordered by insertion order.  That's what we want here.
    var helpObject = new Map();

    const actions = {
        "Chop": {
            "group": "Text Editing",
            "help": "Remove the last character from selected element.",
            "function": lists.chop
        },
        "AppendNewline": {
            "group": "Text Editing",
            "help": "Append a newline to the selected element.",
            "function": lists.appendNewline
        },
        "Delete": {
            "group": "Item Manipulation",
            "help": "Delete the selected element or list.",
            "function": lists.deleteSelection
        },
        "ForceAddEmptyElement": {
            "group": "Item Manipulation",
            "help": "Force add an empty element after selection.",
            "function": lists.forceAddEmptyElement
        },
        "SelectUp": {
            "group": "Selection Movement",
            "help": "Select element 'above' current element or the list.",
            "function": lists.selectUp
        },
        "SelectDown": {
            "group": "Selection Movement",
            "help": "Select element 'below' current element or the list.",
            "function": lists.selectDown
        },
        "SelectLeft": {
            "group": "Selection Movement",
            "help": "Select element to the left or create list to the left.",
            "function": lists.selectLeft
        },
        "SelectRight": {
            "group": "Selection Movement",
            "help": "Select element to the right or create list to the right.",
            "function": lists.selectRight
        },
        "MoveUp": {
            "group": "Move Selection",
            "help": "Move element 'above' current element.",
            "function": lists.moveUp
        },
        "MoveDown": {
            "group": "Move Selection",
            "help": "Move element 'below' current element.",
            "function": lists.moveDown
        },
        "MoveLeft": {
            "group": "Move Selection",
            "help": "Move list or element to the left, create a new list if necessary.",
            "function": lists.moveLeft
        },
        "MoveRight": {
            "group": "Move Selection",
            "help": "Move list or element to the right, create a new list if necessary.",
            "function": lists.moveRight
        }
    }

    function setDefaultBindings() {
        //Clear out the current bindings.
        fnbindings = {};
        helpObject = new Map();

        //Set up all the default bindings.
        bindKeyToAction("Backspace", "Chop");
        bindKeyToAction("ShiftEnter", "AppendNewline");
        bindKeyToAction("Delete", "Delete");
        bindKeyToAction("Enter", "ForceAddEmptyElement");
        bindKeyToAction("ArrowUp", "SelectUp");
        bindKeyToAction("ArrowDown", "SelectDown");
        bindKeyToAction("ArrowLeft", "SelectLeft");
        bindKeyToAction("ArrowRight", "SelectRight");
        bindKeyToAction("CtrlShiftArrowUp", "MoveUp");
        bindKeyToAction("CtrlShiftArrowDown", "MoveDown");
        bindKeyToAction("CtrlShiftArrowLeft", "MoveLeft");
        bindKeyToAction("CtrlShiftArrowRight", "MoveRight");
    }

    //key is a string built in the following way:
    //  Prepend Modifiers (in this order): Alt, Ctrl, Meta, Shift
    //  Append the HTML KeyboardEvent.code
    //    (see: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)
    //action is the actions map key.
    function bindKeyToAction(key, action) {
        if (!actions[action]) {
            console.error("Tried to bind unknown action",
                          key, action);
            return false;
        }
        if (!actions[action].function) {
            console.error("Action doesn't have a function when trying to bind",
                          key, action, actions[action].function);
            return false;
        }
        //Build the function map.
        fnbindings[key] = actions[action].function;

        //Build the help object as we're adding... the order they are added
        // determines the order the help will come out.
        //
        // Objects we're building from:
        // "[Action]": {
        //     "group": "[Group]",
        //     "help": "[Help Text]",
        //     "function": [function]
        // }
        // key ex: CtrlShiftArrowDown
        //
        // Mutate them to:
        // Group[] -> { group, action[] } -> { action, help, key[] }
        var a = actions[action];
        if (!helpObject.has(a.group)) {
            var nm = new Map();
            nm.set("group", a.group);
            nm.set("actions", new Map());
            helpObject.set(a.group, nm);
        }
        var hgroup = helpObject.get(a.group);
        if (!hgroup.get("actions").has(action)) {
            var nm = new Map();
            nm.set("action", textify(action) + ":");
            nm.set("help", a.help);
            nm.set("keys", []);
            hgroup.get("actions").set(action, nm);

        }
        hgroup.get("actions").get(action).get("keys").push(textifyMods(key));
    }

    function textifyMods(s) {
        s = s.replace("Alt", "Alt + ");
        s = s.replace("Ctrl", "Ctrl + ");
        s = s.replace("Meta", "Meta + ");
        s = s.replace("Shift", "Shift + ");
        return s;
    }

    function textify(s) {
        s = s.replace(/([A-Z])/g, ' $1').trim();
        return s;
    }

    function modsString(eve) {
        var s = "";
        s += eve.altKey ? "Alt" : "";
        s += eve.ctrlKey ? "Ctrl" : "";
        s += eve.metaKey ? "Meta" : "";
        s += eve.shiftKey ? "Shift" : "";
        return s;
    }

    function handle(eve) {
        var mods = modsString(eve);
        var k = mods + eve.key;
        if (DEBUG) { console.log("key handler <<" + k + ">>", fnbindings[k]); }
        if (fnbindings[k]) {
            fnbindings[k]();
            lists.trySave();
        } else if ((mods === "" || mods === "Shift") && (
            (eve.keyCode > 47 && eve.keyCode < 58) ||     // numbers
            eve.keyCode == 32 ||                          // spacebar
            eve.keyCode == 61 ||                          // =
            eve.keyCode == 173 ||                         // -
            (eve.keyCode > 64 && eve.keyCode < 91) ||     // letters
            (eve.keyCode > 95 && eve.keyCode < 112) ||    // numpad
            (eve.keyCode > 185 && eve.keyCode < 193) ||   // ;=,-./`
            (eve.keyCode > 218 && eve.keyCode < 223))) {  // [\]'
            lists.appendSelection(eve.key);
        }
    }

    function newDiv(css, text) {
        var d = document.createElement("div");
        if (css) {
            d.classList.add(css);
        }
        if (text) {
            d.innerHTML = text;
        }
        return d;
    }

    //This is kinda painful...
    function buildHelp(root) {
        var intro = `
             Rapidly create and manage lists of things.  It is entirely keyboard
             driven so that the interface "gets out of your way".<br><br>

             To get started: Type something and press enter.  Then type
             something else and press enter.  You now have two elements in a
             first list.  Press the up or down arrows to select the other
             element (or the list).  Press the right or left arrow to create a
             new list to the right or left.  Add more elements.  "Grab" an
             element with "Ctrl + Shift", then use the arrow keys to move the
             element around (try up, down, moving it off the current list, etc.
             Press delete to delete an element.  Those are the basics...<br><br>

             Otherwise, these are actions that are triggered by key
             combinations.  Hover over the action to get a description.
          `;
        var h = newDiv('help');
        root.appendChild(h);
        var hh = newDiv('help-header', intro);
        h.appendChild(hh);
        var hg = newDiv('help-groups-container');
        h.appendChild(hg);
        var rhr = newDiv(null, '<hr>');
        root.appendChild(rhr);

        //Each of the groups
        helpObject.forEach(function (value, key, map) {
            var gd = newDiv('help-group');
            hg.appendChild(gd);
            //Group Name (Header)
            var hgh = newDiv('help-group-header', value.get("group"));
            gd.appendChild(hgh);
            var hbr = newDiv(null, '<hr>');
            gd.appendChild(hbr);

            value.get("actions").forEach(function (aval, akey) {
                //Action
                var actcnt = newDiv('help-action-container');
                gd.appendChild(actcnt);
                var act = newDiv('help-action', aval.get("action"));
                actcnt.appendChild(act);
                //Key Bindings
                var keycnt = newDiv('help-key-container');
                actcnt.appendChild(keycnt);
                aval.get("keys").forEach(function (kval) {
                    var keycom = newDiv('help-key', kval);
                    keycnt.appendChild(keycom);
                });
            });
        });
    }

    setDefaultBindings();
    //This is where we should localStorage override on load
    return {
        handle,
        buildHelp
    };
}

export { createKeyHandler };
window.createKeyHandler = createKeyHandler;
