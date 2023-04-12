import { createListParser } from "./list-parser.js"

function createLists(root, storage) {
    var selection;
    var saveScheduled = false;
    var parser = createListParser(root);

    //Constants
    const DEBUG_KEYS = false;
    const DEBUG_STORAGE = false;
    const KELEMENT = 'type-kelement';
    const KLIST = 'type-klist';
    const SAVE_PERIOD = 3000;
    const DATA_STORAGE_KEY = "listData";

    //Methods
    function init() {
        //Check local storage for previous data, otherwise, create some
        // empty list.
        if (dataInStorage()) {
            restoreFromStorage();
        } else {
            //Empty List
            initMinimum();
        }
    }

    //---- Clear, reset, init minimum ----
    function clearData() {
        root.replaceChildren();
    }

    function resetList() {
        clearData();
        initMinimum();
    }

    function initMinimum() {
        var elementDiv = newElementDiv();
        selection = select(elementDiv);
        var listDiv = newListDiv();
        listDiv.appendChild(elementDiv)
        root.appendChild(listDiv);
    }

    //---- List Div Manipulations ----
    function newListDiv() {
        var div = document.createElement('div');
        div.classList.add('list');
        div.ktype = KLIST;
        return div;
    }

    function addEmptyListRight(e) {
        var elementDiv = newElementDiv();
        var listDiv = newListDiv();
        listDiv.appendChild(elementDiv);
        e.parentElement.after(listDiv);
        selection = select(elementDiv);
        return elementDiv;
    }

    function addEmptyListLeft(e) {
        var elementDiv = newElementDiv();
        var listDiv = newListDiv();
        listDiv.appendChild(elementDiv);
        e.parentElement.before(listDiv);
        selection = select(elementDiv);
        return elementDiv;
    }

    function addListRight(selection) {
        var listDiv = newListDiv();
        var parentElement = selection.parentElement;
        selection.parentElement.after(listDiv);
        listDiv.appendChild(selection);
        tryCollapse(parentElement);
        return selection;
    }

    function addListLeft(selection) {
        var listDiv = newListDiv();
        var parentElement = selection.parentElement;
        selection.parentElement.before(listDiv);
        listDiv.appendChild(selection);
        tryCollapse(parentElement);
        return selection;
    }

    //---- Element Div Manipulations ----
    function newElementDiv() {
        var div = document.createElement('div');
        div.classList.add('list-element');
        div.ktype = KELEMENT;
        return div;
    }

    function addElementAndSelectAfter(e) {
        var div = newElementDiv();
        e.after(div);
        selection = select(div);
    }

    function addElementAndSelectBefore(e) {
        var div = newElementDiv();
        e.before(div);
        selection = select(div);
    }

    function appendSelection(s) {
        //Append to the selection
        selection.innerText += s;
    }

    //---- Keyboard Event Handling ----
    function noMods(eve) {
        return !(eve.altKey || eve.ctrlKey || eve.metaKey || eve.shiftKey);
    }

    // There's probably a more efficient way to do ..
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

    //Only save stuff periodically
    function trySave() {
        if (!saveScheduled) {
            setTimeout(function () {
                saveToStorage();
                saveScheduled = false; //Huh, probably private soon
            }, SAVE_PERIOD)
            saveScheduled = true;
        }
    }

    //TODO: plumb this up/through?
    function deselectAllText() {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
        else if (document.selection) {
            document.selection.empty();
        }
    }

    //Top level key handler - all keyboard input flows through here.
    //TODO: Factor ths out into a Key Handler
    function keyHandler(eve) {
        if (selection && selection.ktype === KELEMENT) {
            keyHandlerElement(eve);
        } else if (selection && selection.ktype === KLIST) {
            keyHandlerList(eve);
        }
        trySave();
    }

    // When a list is selected...
    function keyHandlerList(eve) {
        //Up (no modifiers): select last element
        if (noMods(eve) && eve.keyCode === 38) {
            selection = select(selection.lastChild);
        //Down (no modifiers): select first element
        } else if (noMods(eve) && eve.keyCode === 40) {
            selection = select(selection.firstChild);
        //Right (no modifiers): select list to right
        } else if (noMods(eve) && eve.keyCode === 39) {
            if (selection.nextSibling) {
                selection = select(selection.nextSibling);
            }
        //Left (no modifiers): select list to left
        } else if (noMods(eve) && eve.keyCode === 37) {
            if (selection.previousSibling) {
                selection = select(selection.previousSibling);
            }
        //Right (ctrl+shift): move list to right
        } else if (exactMods(eve, ['ctrl', 'shift']) && eve.keyCode === 39) {
            deselectAllText();
            if (selection.nextSibling) {
                selection.nextSibling.after(selection);
            }
        //Left (ctrl+shift): move list to left
        } else if (exactMods(eve, ['ctrl', 'shift']) && eve.keyCode === 37) {
            deselectAllText();
            if (selection.previousSibling) {
                selection.previousSibling.before(selection);
            }
        //Delete (no modifiers): delete the current list
        } else if (noMods(eve) && eve.keyCode === 46) {
            //Try left, then right
            var ns = selection.previousSibling;
            ns = ns ? ns : selection.nextSibling;
            //Ok, there's only one list. So clear it out and return.
            if (!ns) {
                selection.replaceChildren();
                selection.appendChild(newElementDiv());
                //Just keep it selected.
                return;
            }
            //Delete the thing that was previously selected
            var toDelete = selection;
            selection = select(ns);
            toDelete.parentElement.removeChild(toDelete);
            toDelete.remove();
        //Log what falls through
        } else {
            if (DEBUG_KEYS) { console.log(eve) };
        }
    }

    // When an element is selected...
    function keyHandlerElement(eve) {
        //Regular Typing, append to selected cell
        if ((noMods(eve) || exactMods(eve, ['shift'])) && (
            (eve.keyCode > 47 && eve.keyCode < 58) ||    // numbers
            eve.keyCode == 32 ||                         // spacebar
            eve.keyCode == 61 ||                         // =
            eve.keyCode == 173 ||                        // -
            (eve.keyCode > 64 && eve.keyCode < 91) ||    // letters
            (eve.keyCode > 95 && eve.keyCode < 112) ||   // numpad
            (eve.keyCode > 185 && eve.keyCode < 193) ||  // ;=,-./`
            (eve.keyCode > 218 && eve.keyCode < 223))) {  // [\]'
            appendSelection(eve.key);
        //Backspace (no modifiers): remove last character
        } else if (noMods(eve) && eve.keyCode === 8) {
            backspace();
        //\n (no modifiers): Force create a new element after current element
        } else if (noMods(eve) && eve.keyCode === 13) {
            addElementAndSelectAfter(selection);
        //\n (+shift): append a newline in current element
        } else if (exactMods(eve, ['shift']) && eve.keyCode === 13) {
            appendSelection('\n');
        //Up (no modifiers): Select element above, make an empty element
        // above, or select the list if falling off the top of the list
        } else if (noMods(eve) && eve.keyCode === 38) {
            if (selection.previousElementSibling) {
                selection = select(selection.previousElementSibling);
            } else {
                //Going off the "top", then we select the container
                if (selection.innerText === "") {
                    selection = select(selection.parentElement);
                } else {
                    addElementAndSelectBefore(selection);
                }
            }
        //Down (no modifiers): Select element below, make an empty element
        // below, or select the list if falling off the bottom of the list
        } else if (noMods(eve) && eve.keyCode === 40) {
            if (selection.nextElementSibling) {
                selection = select(selection.nextElementSibling);
            } else {
                if (selection.innerText === "") {
                    selection = select(selection.parentElement);
                } else {
                    addElementAndSelectAfter(selection);
                }
            }
        //Up (ctrl+shift): Move selection up
        } else if (exactMods(eve, ['ctrl', 'shift']) && eve.keyCode === 38) {
            deselectAllText();
            if (selection.previousElementSibling) {
                selection.previousElementSibling.before(selection);
            }
        //Down (ctrl+shift): Move selection down
        } else if (exactMods(eve, ['ctrl', 'shift']) && eve.keyCode === 40) {
            deselectAllText();
            if (selection.nextElementSibling) {
                selection.nextElementSibling.after(selection);
            }
        //Right (no modifiers): Select an element in the list to the right or
        // create a new list with an empty element to the right
        } else if (noMods(eve) && eve.keyCode === 39) {
            if (selection.parentElement.nextSibling) {
                var ele = findClosest(
                    selection, selection.parentElement.nextSibling);
                selection = select(ele);
            } else {
                addEmptyListRight(selection);
            }
        //Left (no modifiers): Select an element in the list to the left or
        // create a new list with an empty element to the right
        } else if (noMods(eve) && eve.keyCode === 37) {
            if (selection.parentElement.previousSibling) {
                var ele = findClosest(
                    selection, selection.parentElement.previousSibling);
                selection = select(ele);
            } else {
                addEmptyListLeft(selection);
            }
        //Right (ctrl+shift): Move an element in the list to the right,
        // creating a new list if necessary
        } else if (exactMods(eve, ['ctrl', 'shift']) && eve.keyCode === 39) {
            deselectAllText();
            if (selection.parentElement.nextSibling) {
                var parentElement = selection.parentElement;
                var ele = findClosest(
                    selection, parentElement.nextSibling);
                moveBeforeOrAfter(ele, selection);
                tryCollapse(parentElement);
            } else {
                addListRight(selection);
            }
        //Left (ctrl+shift): Move an element in the list to the left,
        // creating a new list if necessary
        } else if (exactMods(eve, ['ctrl', 'shift']) && eve.keyCode === 37) {
            deselectAllText();
            if (selection.parentElement.previousSibling) {
                var parentElement = selection.parentElement;
                var ele = findClosest(
                    selection, parentElement.previousSibling);
                moveBeforeOrAfter(ele, selection);
                tryCollapse(parentElement);
            } else {
                addListLeft(selection);
            }
        //Delete (no modifiers): delete the current element
        } else if (noMods(eve) && eve.keyCode === 46) {
            //Find the new thing to select... try up, down, left and right
            var pe = selection.parentElement;
            var ns = selection.previousSibling;
            ns = ns ? ns : selection.nextSibling;
            ns = (ns || !pe.previousSibling) ?
                ns : findClosest(selection, pe.previousSibling);
            ns = (ns || !pe.nextSibling) ?
                ns : findClosest(selection, pe.nextSibling);
            //If we didn't find anything it's the last element so just clear
            // the contents and return
            if (!ns) {
                selection.innerText = "";
                return;
            }
            //Delete the thing that was previously selected
            var toDelete = selection;
            selection = select(ns);
            //Since select will collapse, it's possible that we're done with
            // the parent already.
            var dp = toDelete.parentElement;
            if (dp) {
                dp.removeChild(toDelete);
                tryCollapse(dp);
            }
            toDelete.remove();
            //Log what falls through
        } else {
            if (DEBUG_KEYS) { console.log(eve) };
        }
    }

    function backspace() {
        if (selection) {
            //Is a div, has text, take off the last character
            if (selection.innerText !== "") {
                selection.innerText = selection.innerText.slice(0, -1);
            } else {
                //Remove until there's only a blank element
                if (selection.previousElementSibling !== null) {
                    toSelect = selection.previousElementSibling;
                    selection.remove();
                    selection = select(toSelect);
                } else if (selection.nextElementSibling !== null) {
                    toSelect = selection.nextElementSibling;
                    selection.remove();
                    selection = select(toSelect);
                }
            }
        }
    }

    function findClosest(ele, list) {
        var rect = ele.getBoundingClientRect();
        var y = rect.y;
        var ch = list.firstChild;
        while(ch.nextSibling !== null &&
              y > ch.getBoundingClientRect().y) {
            ch = ch.nextSibling;
        }
        return ch;
    }

    //Sometimes we move it before, other times after...
    function moveBeforeOrAfter(ele, selection) {
        var ey = ele.getBoundingClientRect().y;
        var sy = selection.getBoundingClientRect().y;
        if (sy <= ey) {
            ele.before(selection);
        } else {
            ele.after(selection);
        }
    }

    //---- Selecting functions w/styling ----
    function styleSelect(div) {
        div.style.borderWidth = 2;
        div.style.margin = 1;
        div.style.borderColor = '#000080';
        return div;
    }

    function styleUnselect(div) {
        div.style.borderWidth = 1;
        div.style.margin = 2;
        div.style.borderColor = '#BEBEBE';
        return div;
    }

    function select(e) {
        var oldSelection = selection;
        selection = e;
        styleSelect(selection);
        if (oldSelection) {
            styleUnselect(oldSelection);
            tryCollapse(oldSelection.parentElement);
            tryCollapse(oldSelection);
        }
        return selection;
    }

    function tryCollapse(e) {
        if (!e) {
            return true;
        }

        //We don't want to collapse when there's only one
        // "empty" element and either the element or the
        // list is selected.
        if (e.ktype === KELEMENT &&
            selection === e.parentElement &&
            e.parentElement.children.length === 1) {
            return false;
        } else if (e.ktype === KLIST &&
                   selection === e.firstChild &&
                   e.children.length === 1) {
            return false;
        }

        //Collapse the list or the element
        var ret = false;
        if (e.ktype === KLIST) {
            if (e.children.length === 1) {
                if (tryCollapse(e.firstChild)) {
                    e.remove();
                    ret = true;
                }
            } else if (e.children.length === 0) {
                e.remove();
                ret = true;
            }
        } else if (e.ktype === KELEMENT) {
            if (e.innerText === "") {
                e.remove();
                ret = true;
            }
        }
        return ret;
    }

    //---- Save and load from storage ----
    function dataInStorage() {
        return (storage.getItem(DATA_STORAGE_KEY) !== null);
    }

    function saveToStorage() {
        storage.setItem(DATA_STORAGE_KEY, stringify());
    }

    function restoreFromStorage() {
        if (!dataInStorage()) {
            if (DEBUG_STORAGE) {
                console.log("No data in storage.  Nothing to do...");
            }
            return;
        }
        var dataString = storage.getItem(DATA_STORAGE_KEY);
        if (DEBUG_STORAGE) {
            console.log("Loading from local storage:", dataString);
        }
        if(!fromString(dataString)) {
            console.error("Failed to parse what was in local storage.",
                          "Check console error log.");
            //TODO: Disable autosaving?
        }
    }

    //---- To and from strings
    function stringify() {
        return parser.stringify();
    }

    function fromString(dataString) {
        if (DEBUG_STORAGE) { console.log("dataString", dataString); }
        var data = parser.parse(dataString);
        if (DEBUG_STORAGE) { console.log("Parsed data", data); }
        if (!data) {
            return false;
        }

        //Just skip everything below if we have an empty object or array
        if (data.lists.length === 0) {
            resetList();
            return true;
        }

	//Clear, then load.
        clearData();

	//Try to load the data...
        //TODO: Insert all the other fields into the dom overlay
        var firstElement = null;
        for (var i = 0; i < data.lists.length; ++i) {
            //Make a new list div
            var listDiv = newListDiv();
            root.appendChild(listDiv);
            var list = data.lists[i];
            for (var j = 0; j < list.elements.length; ++j) {
                //Make a new element div
                var elementDiv = newElementDiv();
                elementDiv.innerText = list.elements[j].data;
                listDiv.appendChild(elementDiv)
                if (firstElement === null) {
                    firstElement = elementDiv;
                }
            }
        }
        //Ok, nothing was really there.
        if (!firstElement) {
            firstElement = newElementDiv();
            root.firstChild.appendChild(firstElement);
        }
        selection = select(firstElement);
        trySave();
        return true;
    }

    //Public Methods.
    return {
        init,
        keyHandler,
        resetList,
        stringify,
        fromString
    };
}

export { createLists };
window.createLists = createLists;
