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
        "SelectUp": {
            "group": "Selection Movement",
            "help": "Select element 'above' current element or the list.",
            "function": lists.selectUp
        }
    }

    //key is ...
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

    function setDefaultBindings() {
        bindKeyToAction("ArrowUp", "SelectUp");
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
