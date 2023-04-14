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
        //TODO: Clear all bindings first.
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

    function noMods(eve) {
        return !(eve.altKey || eve.ctrlKey || eve.metaKey || eve.shiftKey);
    }

    function exactMods(eve, mods) {
        var posMods = ['alt', 'ctrl', 'meta', 'shift'];
        var ret = 1;
        for (var i = 0; i < posMods.length; ++i) {
            var mod = posMods[i];
            if (mods.includes(mod)) {
                //Has to be set
                ret &= eve[mod + 'Key'];
            } else {
                //Has to not be set
                ret &= !(eve[mod + 'Key']);
            }
        }
        return ret;
    }

    function handle(eve) {
        var k = modsString(eve) + eve.key;
        if (DEBUG) { console.log("key handler <<" + k + ">>", fnbindings[k]); }
        if (fnbindings[k]) {
            fnbindings[k]();
            lists.trySave();
        } else if ((noMods(eve) || exactMods(eve, ['shift'])) && (
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

    setDefaultBindings();
    //This is where we should localStorage override on load
    return {
        handle
    };
}

export { createKeyHandler };
window.createKeyHandler = createKeyHandler;
