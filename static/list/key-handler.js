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
    var DEBUG = true;
    var fnbindings = {};

    var actions = {
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
        "AddEmptyElementAfterSelection": {
            "group": "",
            "help": "Force add an empty element after selection.",
            "function": lists.addEmptyElementAfterSelection
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
        }
    }

    function setDefaultBindings() {
        bindKeyToAction("Backspace", "Chop");
        bindKeyToAction("ShiftEnter", "AppendNewline");
        bindKeyToAction("Enter", "AddEmptyElementAfterSelection");
        bindKeyToAction("ArrowUp", "SelectUp");
        bindKeyToAction("ArrowDown", "SelectDown");
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
        fnbindings[key] = actions[action].function;
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
        var k = modsString(eve) + eve.key;
        if (DEBUG) { console.log("key handler <<" + k + ">>", fnbindings[k]); }
        if (fnbindings[k]) {
            fnbindings[k]();
            lists.trySave();
        }
    }

    setDefaultBindings();
    //This is where we should localStorage override on load
    return {
        handle
    };
}

export { createKeyHandler };
window.createKeyHandler = createKeyHandler;
