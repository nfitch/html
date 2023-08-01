import { createListParser } from "./list-parser.js"

function createLists(root, storage) {
    var selection;
    var saveScheduled = false;
    var parser = createListParser(root);
    var cutOrCopied = null;

    //Constants
    const DEBUG_STORAGE = false;
    const ELEMENT_TYPE = 'lists-element';
    const LIST_TYPE = 'lists-list';
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

    function toggleStorageDebug() {
        DEBUG_STORAGE = !DEBUG_STORAGE;
    }

    //---- Clear, reset, init minimum ----
    function clearData() {
        // DOM (!)
        root.replaceChildren();
    }

    function resetList() {
        clearData();
        initMinimum();
    }

    function initMinimum() {
        // DOM (!)
        var elementDiv = newElementDiv();
        var listDiv = newListDiv();
        listDiv.appendChild(elementDiv)
        root.appendChild(listDiv);
        selection = select(elementDiv);
    }

    //---- List Div Manipulations ----
    function newListDiv() {
        // DOM (!)
        var div = document.createElement('div');
        div.classList.add('list');
        div.liststype = LIST_TYPE;
        return div;
    }

    function addEmptyListRight(e) {
        // DOM (!)
        var elementDiv = newElementDiv();
        var listDiv = newListDiv();
        listDiv.appendChild(elementDiv);
        e.parentElement.after(listDiv);
        selection = select(elementDiv);
        return elementDiv;
    }

    function addEmptyListLeft(e) {
        // DOM (!)
        var elementDiv = newElementDiv();
        var listDiv = newListDiv();
        listDiv.appendChild(elementDiv);
        e.parentElement.before(listDiv);
        selection = select(elementDiv);
        return elementDiv;
    }

    function addListRight(selection) {
        // DOM (!)
        var listDiv = newListDiv();
        var parentElement = selection.parentElement;
        selection.parentElement.after(listDiv);
        listDiv.appendChild(selection);
        tryCollapse(parentElement);
        return selection;
    }

    function addListLeft(selection) {
        // DOM (!)
        var listDiv = newListDiv();
        var parentElement = selection.parentElement;
        selection.parentElement.before(listDiv);
        listDiv.appendChild(selection);
        tryCollapse(parentElement);
        return selection;
    }

    //---- Element Div Manipulations ----
    function newElementDiv() {
        // DOM (!)
        var div = document.createElement('div');
        div.classList.add('list-element');
        div.liststype = ELEMENT_TYPE;
        return div;
    }

    function addElementAndSelectAfter(e) {
        // DOM (!)
        var div = newElementDiv();
        e.after(div);
        selection = select(div);
    }

    function addElementAndSelectBefore(e) {
        // DOM (!)
        var div = newElementDiv();
        e.before(div);
        selection = select(div);
    }

    //Append text to the selection
    function appendSelection(s) {
        // DOM (!)
        selection.innerText += s;
    }

    //Only save stuff periodically
    function trySave() {
        if (!saveScheduled) {
            setTimeout(function () {
                saveToStorage();
                saveScheduled = false;
            }, SAVE_PERIOD)
            saveScheduled = true;
        }
    }

    //TODO: plumb this up/through?
    function deselectAllText() {
        // DOM (!)
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
        else if (document.selection) {
            document.selection.empty();
        }
    }

    //---- Actions for selection ----

    //Chop: remove last character from selected element
    function chop() {
        // DOM (!)
        if (selection && selection.liststype === ELEMENT_TYPE) {
            //Is a div, has text, take off the last character
            if (selection.innerText !== "") {
                selection.innerText = selection.innerText.slice(0, -1);
            }
            /* TODO: Decide if I like the removal on backspace...
               but when I was using it in the real world, I held down backspace
               and that caused me to delete more from the next elements text
               than I was anticipating... seems more dangrous than it was
               worth.  Will remove eventually depending on real-world usage.
            else {
                //Remove until there's only a blank element
                if (selection.previousElementSibling !== null) {
                    var toSelect = selection.previousElementSibling;
                    selection.remove();
                    selection = select(toSelect);
                } else if (selection.nextElementSibling !== null) {
                    var toSelect = selection.nextElementSibling;
                    selection.remove();
                    selection = select(toSelect);
                }
            }*/
        }
    }

    //AppendNewline: append a newline in current element
    function appendNewline() {
        if (selection && selection.liststype === ELEMENT_TYPE) {
            appendSelection('\n');
        }
    }

    //Element Delete: delete the current element
    //List Delete: delete the current list and all elements
    function deleteSelection() {
        // DOM (!)
        if (selection && selection.liststype === ELEMENT_TYPE) {
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
        } else if (selection && selection.liststype === LIST_TYPE) {
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
        }
    }

    //ForceAddEmptyElement: Force create a new element after current selection.
    function forceAddEmptyElement() {
        if (selection && selection.liststype === ELEMENT_TYPE) {
            addElementAndSelectAfter(selection);
        }
        //TODO: what should we do with a list type?
    }

    //Element SelectUp: Select element above, make an empty element
    // above, or select the list if falling off the top of the list
    //List SelectUp: select last element
    function selectUp() {
        // DOM (!)
        if (selection && selection.liststype === ELEMENT_TYPE) {
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
        } else if (selection && selection.liststype === LIST_TYPE) {
            selection = select(selection.lastChild);
        }
    }

    //Element SelectDown: Select element below, make an empty element
    // below, or select the list if falling off the bottom of the list
    //List Down: select first element
    function selectDown() {
        // DOM (!)
        if (selection && selection.liststype === ELEMENT_TYPE) {
            if (selection.nextElementSibling) {
                selection = select(selection.nextElementSibling);
            } else {
                if (selection.innerText === "") {
                    selection = select(selection.parentElement);
                } else {
                    addElementAndSelectAfter(selection);
                }
            }
        } else if (selection && selection.liststype === LIST_TYPE) {
            selection = select(selection.firstChild);
        }
    }

    //Element SelectLeft: Select an element in the list to the left or create a
    // new list with an empty element to the right
    //List SelectLeft: select list to left
    function selectLeft() {
        // DOM (!)
        if (selection && selection.liststype === ELEMENT_TYPE) {
            if (selection.parentElement.previousSibling) {
                var ele = findClosest(
                    selection, selection.parentElement.previousSibling);
                selection = select(ele);
            } else {
                addEmptyListLeft(selection);
            }
        } else if (selection && selection.liststype === LIST_TYPE) {
            if (selection.previousSibling) {
                selection = select(selection.previousSibling);
            }
            //TODO: This should create an empty list to the Left
        }
    }

    //Element SelectRight: Select an element in the list to the right or create
    // a new list with an empty element to the right
    //List SelectRight: select list to right
    function selectRight() {
        // DOM (!)
        if (selection && selection.liststype === ELEMENT_TYPE) {
            if (selection.parentElement.nextSibling) {
                var ele = findClosest(
                    selection, selection.parentElement.nextSibling);
                selection = select(ele);
            } else {
                addEmptyListRight(selection);
            }
        } else if (selection && selection.liststype === LIST_TYPE) {
            if (selection.nextSibling) {
                selection = select(selection.nextSibling);
            }
            //TODO: This should create an empty list to the Left
        }
    }

    //Element MoveUp: Move selection up
    function moveUp() {
        // DOM (!)
        if (selection && selection.liststype === ELEMENT_TYPE) {
            deselectAllText();
            if (selection.previousElementSibling) {
                selection.previousElementSibling.before(selection);
            }
        }
    }

    //Element MoveDown: Move selection down
    function moveDown() {
        // DOM (!)
        if (selection && selection.liststype === ELEMENT_TYPE) {
            deselectAllText();
            if (selection.nextElementSibling) {
                selection.nextElementSibling.after(selection);
            }
        }
    }

    //Element MoveLeft: Move an element in the list to the left, creating a new
    // list if necessary.
    //List MoveLeft: move list to left
    function moveLeft() {
        // DOM (!)
        if (selection && selection.liststype === ELEMENT_TYPE) {
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
        } else if (selection && selection.liststype === LIST_TYPE) {
            deselectAllText();
            if (selection.previousSibling) {
                selection.previousSibling.before(selection);
            }
        }
    }

    //Element MoveRight: Move an element in the list to the right, creating a
    // new list if necessary.
    //List MoveRight: move list to right
    function moveRight() {
        // DOM (!)
        if (selection && selection.liststype === ELEMENT_TYPE) {
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
        } else if (selection && selection.liststype === LIST_TYPE) {
            deselectAllText();
            if (selection.nextSibling) {
                selection.nextSibling.after(selection);
            }
        }
    }

    //Element Cut: Cut the current element.
    //List Cut: Cut the current list.
    function cut() {
        // DOM (!)
        if (selection && selection.liststype === ELEMENT_TYPE) {
            cutOrCopied = selection.innerText;
            deleteSelection();
        } else if (selection && selection.liststype === LIST_TYPE) {
            cutOrCopied = [];
            Array.from(selection.children).forEach(function (c) {
                cutOrCopied.push(c.innerText);
            });
            deleteSelection();
        }
    }

    //Element Copy: Copy the current element.
    //List Copy: Copy elements in list.
    function copy() {
        // DOM (!)
        if (selection && selection.liststype === ELEMENT_TYPE) {
            cutOrCopied = selection.innerText;
        } else if (selection && selection.liststype === LIST_TYPE) {
            cutOrCopied = [];
            Array.from(selection.children).forEach(function (c) {
                cutOrCopied.push(c.innerText);
            });
        }
    }

    //Element Paste: Paste a previously copied element.
    //List Paste: Paste list to the left, or elements after current element.
    function paste() {
        // DOM (!)
        if (cutOrCopied === null || !selection) {
            return;
        }
        var sType = selection.liststype;
        var cTypeElement = !Array.isArray(cutOrCopied);
        var cTypeList = Array.isArray(cutOrCopied);
        //This is a little weird because where/how we paste depends on
        // what is copied.  There are 4 cases:
        // 1. element copied, element selected: paste after current selection, select pasted
        if (cTypeElement && sType === ELEMENT_TYPE) {
            addElementAndSelectAfter(selection);
            appendSelection(cutOrCopied);
        // 2. element copied, list selected: paste at end of the list, select pasted
        } else if (cTypeElement && sType === LIST_TYPE) {
            selection = select(selection.lastChild);
            addElementAndSelectAfter(selection);
            appendSelection(cutOrCopied);
        // 3. list copied, element selected: paste individual elements, select last
        } else if (cTypeList && sType === ELEMENT_TYPE) {
            cutOrCopied.forEach(function (s) {
                addElementAndSelectAfter(selection);
                appendSelection(s);
            });
        // 4. list copied, list selected: paste list to right, select list
        } else if (cTypeList && sType === LIST_TYPE) {
            addEmptyListRight(selection.firstChild);
            cutOrCopied.forEach(function (s) {
                addElementAndSelectAfter(selection);
                appendSelection(s);
            });
            select(selection.parentElement);
        }
    }

    //---- Finding and moving ----
    function findClosest(ele, list) {
        // DOM (!)
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
        // DOM (!)
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
        // DOM (!)
        div.style.borderWidth = 2;
        div.style.margin = 1;
        div.style.borderColor = '#000080';
        return div;
    }

    function styleUnselect(div) {
        // DOM (!)
        div.style.borderWidth = 1;
        div.style.margin = 2;
        div.style.borderColor = '#BEBEBE';
        return div;
    }

    function select(e) {
        // DOM (!)
        var oldSelection = selection;
        selection = e;
        styleSelect(selection);
        if (oldSelection) {
            styleUnselect(oldSelection);
            tryCollapse(oldSelection.parentElement);
            tryCollapse(oldSelection);
        }
        // DOM (!)
        if (selection && selection.liststype === ELEMENT_TYPE) {
            selection.parentElement.scrollIntoView(false);
            selection.scrollIntoView(false);
        } else if (selection && selection.liststype === LIST_TYPE) {
            selection.scrollIntoView();
        }
        return selection;
    }

    function tryCollapse(e) {
        // DOM (!)
        if (!e) {
            return true;
        }

        //We don't want to collapse when there's only one
        // "empty" element and either the element or the
        // list is selected.
        if (e.liststype === ELEMENT_TYPE &&
            selection === e.parentElement &&
            e.parentElement.children.length === 1) {
            return false;
        } else if (e.liststype === LIST_TYPE &&
                   selection === e.firstChild &&
                   e.children.length === 1) {
            return false;
        }

        //Collapse the list or the element
        var ret = false;
        if (e.liststype === LIST_TYPE) {
            if (e.children.length === 1) {
                if (tryCollapse(e.firstChild)) {
                    e.remove();
                    ret = true;
                }
            } else if (e.children.length === 0) {
                e.remove();
                ret = true;
            }
        } else if (e.liststype === ELEMENT_TYPE) {
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
        if(!loadString(dataString, true)) {
            console.error("Failed to parse what was in local storage.",
                          "Check console error log.");
            //TODO: Disable autosaving?
        }
    }

    //---- To and from strings
    function stringify() {
        return parser.stringify();
    }

    function loadString(dataString, clear) {
        // DOM (!)
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

	//Maybe clear, then load.
        if (clear) {
            clearData();
        }

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
        toggleStorageDebug,
        resetList,
        stringify,
        loadString,
        trySave,

        // Actions on Selection
        chop,
        appendNewline,
        deleteSelection,
        appendSelection,
        forceAddEmptyElement,
        selectUp,
        selectDown,
        selectLeft,
        selectRight,
        moveUp,
        moveDown,
        moveLeft,
        moveRight,
        cut,
        copy,
        paste
    };
}

export { createLists };
window.createLists = createLists;
