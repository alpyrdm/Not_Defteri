// --- TO-DO HUB MOTORU ---
const activeLang = localStorage.getItem('hub_lang') || 'tr';
let todoVerileri = JSON.parse(localStorage.getItem('hub_todo_hub_v2') || '{"Genel Görevler": {"todo":[], "progress":[], "done":[]}}');
let aktifListeAdi = Object.keys(todoVerileri)[0] || "Genel Görevler";

let aktifDuzenlenenGorev = null;
let aktifDuzenlenenGorevHavuzKey = null;

function acGorevDuzenleModal(g, havuzKey) {
    aktifDuzenlenenGorev = g;
    aktifDuzenlenenGorevHavuzKey = havuzKey;
    
    const modal = document.getElementById('gorev-detay-modal');
    const inputText = document.getElementById('gd-input-text');
    const inputDate = document.getElementById('gd-input-date');
    const inputTime = document.getElementById('gd-input-time');
    const inputDesc = document.getElementById('gd-input-desc');
    const validationMsg = document.getElementById('gd-validation-msg');
    
    const activeLang = localStorage.getItem('hub_lang') || 'tr';
    
    if (validationMsg) validationMsg.style.display = 'none';
    if (inputText) {
        inputText.style.borderColor = 'var(--border-color, #cbd5e1)';
        inputText.value = g.txt || "";
    }
    if (inputDate) inputDate.value = g.dueDate || "";
    if (inputTime) inputTime.value = g.dueTime || "";
    if (inputDesc) inputDesc.value = g.desc || "";
    
    if (modal) modal.style.display = 'flex';
}

const listelerMenusu = document.getElementById('listeler-menusu'); 
const todoInput = document.getElementById('todo-input'); 
const aktifListeBasligi = document.getElementById('aktif-liste-basligi');
const yeniListeBtn = document.getElementById('yeni-liste-btn');
const todoEkleBtn = document.getElementById('todo-ekle-btn');
const listeSilBtn = document.getElementById('liste-sil-btn');

if (yeniListeBtn) { 
    yeniListeBtn.onclick = () => { 
        const modal = document.getElementById('yeni-liste-modal');
        if (modal) {
            modal.style.display = 'flex';
            const nameInput = document.getElementById('yl-input-name');
            if (nameInput) {
                nameInput.value = '';
                nameInput.focus();
            }
        }
    }; 
}

if (todoEkleBtn) { 
    todoEkleBtn.onclick = () => { 
        const metin = todoInput.value.trim();
        if (!metin) return; 
        todoVerileri[aktifListeAdi]["todo"].push({ id: Date.now().toString(), txt: metin }); 
        todoInput.value = ""; 
        todoHubYenile(); 
    }; 
    // Add Enter key listener for adding todos
    if (todoInput) {
        todoInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                todoEkleBtn.click();
            }
        });
    }
}

if (listeSilBtn) {
    listeSilBtn.onclick = () => {
        if (aktifListeAdi === "Genel Görevler") { 
            alert(activeLang === 'en' ? "You cannot delete the main list." : "Ana listeyi silemezsiniz."); 
            return; 
        }
        const displayName = (activeLang === 'en' && aktifListeAdi === "Genel Görevler") ? "General Tasks" : aktifListeAdi;
        if (confirm(activeLang === 'en' 
            ? `Are you sure you want to delete the list "${displayName}"?` 
            : `"${aktifListeAdi}" listesini silmek istediğinize emin misiniz?`)) {
            delete todoVerileri[aktifListeAdi]; 
            aktifListeAdi = Object.keys(todoVerileri)[0] || "Genel Görevler";
            todoHubYenile();
        }
    };
}

function todoHubYukle() {
    try {
        const data = localStorage.getItem('hub_todo_hub_v2');
        if (data) todoVerileri = JSON.parse(data);
    } catch(e) {}
    
    // Self-healing migration for checklist lists
    Object.keys(todoVerileri).forEach(key => {
        const list = todoVerileri[key];
        if (list.isChecklist) {
            // Ensure all items in todo have completed field
            if (list.todo) {
                list.todo.forEach(item => {
                    if (item.completed === undefined) item.completed = false;
                });
            } else {
                list.todo = [];
            }
            // Move any items in done to todo with completed: true
            if (list.done && list.done.length > 0) {
                list.done.forEach(item => {
                    if (!list.todo.some(x => x.id === item.id)) {
                        list.todo.push({ ...item, completed: true });
                    }
                });
                list.done = [];
            }
        }
    });

    if (!todoVerileri[aktifListeAdi]) {
        aktifListeAdi = Object.keys(todoVerileri)[0] || "Genel Görevler";
    }
}

function todoHubYenile() {
    localStorage.setItem('hub_todo_hub_v2', JSON.stringify(todoVerileri));
    if (aktifListeBasligi) {
        aktifListeBasligi.innerText = (activeLang === 'en' && aktifListeAdi === "Genel Görevler") ? "General Tasks" : aktifListeAdi;
    }
    if (!listelerMenusu) return; 
    
    listelerMenusu.innerHTML = "";
    Object.keys(todoVerileri).forEach(listeAd => { 
        const li = document.createElement('li'); 
        li.innerText = (activeLang === 'en' && listeAd === "Genel Görevler") ? "General Tasks" : listeAd; 
        if (listeAd === aktifListeAdi) li.className = 'active-list'; 
        li.onclick = () => { aktifListeAdi = listeAd; todoHubYenile(); }; 
        listelerMenusu.appendChild(li); 
    });

    const activeList = todoVerileri[aktifListeAdi];
    const isChecklist = activeList && activeList.isChecklist === true;
    
    const colTodo = document.getElementById('havuz-todo');
    const colProgress = document.getElementById('havuz-progress');
    const colDone = document.getElementById('havuz-done');
    
    if (isChecklist) {
        if (colProgress) colProgress.style.display = 'none';
        if (colDone) colDone.style.display = 'none';
        if (colTodo) {
            colTodo.style.flex = '1';
            colTodo.style.width = '100%';
            colTodo.style.maxWidth = 'none';
            const header = colTodo.querySelector('h4');
            if (header) {
                header.innerText = activeLang === 'en' ? "📝 Shopping & Checklist" : "📝 Alışveriş / Kontrol Listesi";
            }
        }

        const ulTodo = document.getElementById('todo-liste-todo');
        if (ulTodo) {
            ulTodo.innerHTML = "";
            const items = activeList.todo || [];
            
            items.forEach(g => {
                const isCompleted = g.completed === true;
                const li = document.createElement('li');
                li.className = "kanban-item checklist-item";
                li.setAttribute('draggable', 'true');
                li.setAttribute('data-id', g.id);
                
                if (isCompleted) {
                    li.classList.add('completed-item');
                    li.style.textDecoration = 'line-through';
                    li.style.opacity = '0.65';
                }
                li.style.cursor = 'grab';
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';
                
                const textSpan = document.createElement('span');
                textSpan.innerText = (isCompleted ? "☑ " : "☐ ") + g.txt;
                textSpan.style.flexGrow = '1';
                textSpan.style.cursor = 'pointer';
                textSpan.onclick = () => {
                    g.completed = !isCompleted;
                    todoHubYenile();
                };
                
                const delBtn = document.createElement('button');
                delBtn.innerText = '🗑️';
                delBtn.style.cssText = "background:transparent; border:none; cursor:pointer; font-size:12px; margin-left: 10px;";
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    activeList.todo = activeList.todo.filter(x => x.id !== g.id);
                    todoHubYenile();
                };
                
                li.append(textSpan, delBtn);
                
                li.addEventListener('dragstart', () => {
                    li.classList.add('dragging');
                });
                
                li.addEventListener('dragend', () => {
                    li.classList.remove('dragging');
                    saveChecklistOrder();
                });
                
                ulTodo.appendChild(li);
            });
            
            ulTodo.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = getDragAfterElement(ulTodo, e.clientY);
                const dragging = document.querySelector('.dragging');
                if (dragging && dragging.classList.contains('checklist-item')) {
                    if (afterElement == null) {
                        ulTodo.appendChild(dragging);
                    } else {
                        ulTodo.insertBefore(dragging, afterElement);
                    }
                }
            });
        }
    } else {
        if (colProgress) colProgress.style.display = 'flex';
        if (colDone) colDone.style.display = 'flex';
        if (colTodo) {
            colTodo.style.flex = '';
            colTodo.style.width = '';
            colTodo.style.maxWidth = '';
            const header = colTodo.querySelector('h4');
            if (header) {
                header.innerText = activeLang === 'en' ? "📋 To Do" : "📋 Yapılacaklar";
            }
        }

        const havuzlar = ["todo", "progress", "done"];
        havuzlar.forEach(havuzKey => {
            const ul = document.getElementById(`todo-liste-${havuzKey}`);
            if (!ul) return;
            ul.innerHTML = "";
            
            if(!todoVerileri[aktifListeAdi][havuzKey]) todoVerileri[aktifListeAdi][havuzKey] = [];
            
            todoVerileri[aktifListeAdi][havuzKey].forEach((g) => {
                const li = document.createElement('li');
                li.className = "kanban-item";
                li.setAttribute('draggable', 'true');
                li.setAttribute('data-id', g.id);
                li.setAttribute('data-source', havuzKey);
                li.style.display = 'flex';
                li.style.flexDirection = 'column';
                li.style.alignItems = 'stretch';
                li.style.gap = '6px';
                li.style.padding = '12px';
                
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.justifyContent = 'space-between';
                row.style.width = '100%';
                
                li.addEventListener('dragstart', (e) => {
                    li.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', g.id);
                    e.dataTransfer.setData('source-pool', havuzKey);
                });
                li.addEventListener('dragend', () => li.classList.remove('dragging'));
                
                row.onclick = () => {
                    let sonrakiHavuz = "progress";
                    if (havuzKey === "todo") sonrakiHavuz = "progress";
                    else if (havuzKey === "progress") sonrakiHavuz = "done";
                    else if (havuzKey === "done") sonrakiHavuz = "todo";
                    
                    todoVerileri[aktifListeAdi][havuzKey] = todoVerileri[aktifListeAdi][havuzKey].filter(x => x.id !== g.id);
                    todoVerileri[aktifListeAdi][sonrakiHavuz].push(g);
                    todoHubYenile();
                };
                
                const textSpan = document.createElement('span');
                textSpan.innerText = g.txt;
                textSpan.style.flexGrow = '1';
                textSpan.style.cursor = 'pointer';
                
                const aksiyonGrup = document.createElement('div');
                aksiyonGrup.style.display = 'flex';
                aksiyonGrup.style.alignItems = 'center';
                
                const kucukDuzenleBtn = document.createElement('button');
                kucukDuzenleBtn.innerText = '⚙️';
                kucukDuzenleBtn.className = 'todo-card-duzenle-btn';
                kucukDuzenleBtn.style.cssText = "background:transparent; border:none; cursor:pointer; font-size:12px; margin-left: 6px; padding: 2px;";
                kucukDuzenleBtn.title = activeLang === 'en' ? 'Task Details / Reminder' : 'Görev Detayları / Hatırlatıcı';
                kucukDuzenleBtn.onclick = (e) => {
                    e.stopPropagation();
                    acGorevDuzenleModal(g, havuzKey);
                };

                const kucukSilBtn = document.createElement('button');
                kucukSilBtn.innerText = '🗑️';
                kucukSilBtn.style.cssText = "background:transparent; border:none; cursor:pointer; font-size:12px; margin-left: 6px; padding: 2px;";
                kucukSilBtn.onclick = (e) => { 
                    e.stopPropagation(); 
                    if (confirm(activeLang === 'en' ? "Are you sure you want to delete this task?" : "Bu görevi silmek istediğinize emin misiniz?")) {
                        todoVerileri[aktifListeAdi][havuzKey] = todoVerileri[aktifListeAdi][havuzKey].filter(x => x.id !== g.id); 
                        todoHubYenile(); 
                    }
                };
                
                aksiyonGrup.append(kucukDuzenleBtn, kucukSilBtn);
                row.append(textSpan, aksiyonGrup);
                li.appendChild(row);
                
                // Add Due Date Badge if configured
                if (g.dueDate && g.dueTime) {
                    const badge = document.createElement('div');
                    badge.style.cssText = 'font-size: 11px; font-weight: bold; border-radius: 4px; padding: 2px 6px; width: fit-content; display: flex; align-items: center; gap: 4px; font-family: inherit; margin-top: 2px;';
                    
                    const targetTime = new Date(`${g.dueDate}T${g.dueTime}`);
                    const isOverdue = (targetTime < new Date()) && (havuzKey !== 'done');
                    
                    if (isOverdue) {
                        badge.style.background = 'rgba(239, 68, 68, 0.08)';
                        badge.style.color = '#ef4444';
                        badge.style.border = '1px solid rgba(239, 68, 68, 0.2)';
                        badge.innerText = `⏰ ${activeLang === 'en' ? 'Overdue' : 'Gecikti'} (${g.dueDate} ${g.dueTime})`;
                    } else {
                        badge.style.background = 'rgba(59, 130, 246, 0.08)';
                        badge.style.color = '#3b82f6';
                        badge.style.border = '1px solid rgba(59, 130, 246, 0.2)';
                        badge.innerText = `⏰ ${g.dueDate} ${g.dueTime}`;
                    }
                    li.appendChild(badge);
                }
                
                ul.appendChild(li);
            });
        });
    }
}

function allowDrop(e) { e.preventDefault(); }

function handleHavuzDrop(e, hedefHavuz) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const kaynakHavuz = e.dataTransfer.getData('source-pool');
    if (kaynakHavuz === hedefHavuz || !id) return;
    
    const gorev = todoVerileri[aktifListeAdi][kaynakHavuz].find(x => x.id === id);
    if (!gorev) return;
    
    todoVerileri[aktifListeAdi][kaynakHavuz] = todoVerileri[aktifListeAdi][kaynakHavuz].filter(x => x.id !== id);
    todoVerileri[aktifListeAdi][hedefHavuz].push(gorev);
    todoHubYenile();
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.checklist-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function saveChecklistOrder() {
    const ulTodo = document.getElementById('todo-liste-todo');
    if (!ulTodo) return;
    
    const activeList = todoVerileri[aktifListeAdi];
    if (!activeList || !activeList.isChecklist) return;
    
    const newOrder = [];
    ulTodo.querySelectorAll('.checklist-item').forEach(li => {
        const id = li.getAttribute('data-id');
        const item = activeList.todo.find(x => x.id === id);
        if (item) {
            newOrder.push(item);
        }
    });
    
    activeList.todo = newOrder;
    localStorage.setItem('hub_todo_hub_v2', JSON.stringify(todoVerileri));
}

window.todoHubYukle = todoHubYukle;
window.todoHubYenile = todoHubYenile;

document.addEventListener('DOMContentLoaded', () => {
    // Inject Create List Modal HTML dynamically
    const modalHTML = `
    <div id="yeni-liste-modal" class="modal-arkaplan" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center; font-family: sans-serif;">
        <div class="modal-kutu" style="background: var(--bg-card, #ffffff); padding: 25px; border-radius: 12px; max-width: 400px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
            <h3 id="yl-modal-baslik" style="margin-top: 0; margin-bottom: 15px; color: var(--text-color, #1e293b);">${activeLang === 'en' ? 'Create New List' : 'Yeni Liste Oluştur'}</h3>
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div>
                    <label id="yl-modal-label-name" style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; color: var(--text-color, #475569);">${activeLang === 'en' ? 'List Name:' : 'Liste Adı:'}</label>
                    <input type="text" id="yl-input-name" placeholder="${activeLang === 'en' ? 'Type list name...' : 'Liste adını yazın...'}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; box-sizing: border-box; outline: none; background: var(--bg-input, #fff); color: var(--text-color, #334155);">
                    <span id="yl-validation-msg" style="display: none; color: #ef4444; font-size: 11px; margin-top: 4px; font-weight: 600;"></span>
                </div>
                <div>
                    <label id="yl-modal-label-type" style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; color: var(--text-color, #475569);">${activeLang === 'en' ? 'List Type:' : 'Liste Türü:'}</label>
                    <select id="yl-select-type" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; box-sizing: border-box; outline: none; background: var(--bg-input, #fff); color: var(--text-color, #334155); font-weight: bold; cursor: pointer;">
                        <option value="kanban">${activeLang === 'en' ? 'Kanban Task Board (3 Columns)' : 'Kanban Görev Panosu (3 Sütunlu)'}</option>
                        <option value="checklist">${activeLang === 'en' ? 'Simple Checklist / Shopping List' : 'Basit Kontrol / Alışveriş Listesi'}</option>
                    </select>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                    <button id="yl-btn-cancel" style="background: #cbd5e1; color: #334155; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;">${activeLang === 'en' ? 'Cancel' : 'İptal'}</button>
                    <button id="yl-btn-create" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;">${activeLang === 'en' ? 'Create' : 'Oluştur'}</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = modalHTML;
    document.body.appendChild(div.firstElementChild);

    // Bind modal actions
    const modal = document.getElementById('yeni-liste-modal');
    const btnCancel = document.getElementById('yl-btn-cancel');
    const btnCreate = document.getElementById('yl-btn-create');
    const nameInput = document.getElementById('yl-input-name');
    const typeSelect = document.getElementById('yl-select-type');
    const validationMsg = document.getElementById('yl-validation-msg');

    const resetValidation = () => {
        if (validationMsg) validationMsg.style.display = 'none';
        if (nameInput) nameInput.style.borderColor = 'var(--border-color, #cbd5e1)';
    };

    if (btnCancel && modal) {
        btnCancel.onclick = () => {
            modal.style.display = 'none';
            resetValidation();
        };
    }

    const submitNewList = () => {
        const name = nameInput.value.trim();
        const type = typeSelect.value;
        
        if (!name) {
            if (validationMsg) {
                validationMsg.innerText = activeLang === 'en' 
                    ? "This field is required!" 
                    : "Bu alanın doldurulması zorunludur!";
                validationMsg.style.display = 'block';
            }
            if (nameInput) {
                nameInput.style.borderColor = '#ef4444';
                nameInput.focus();
            }
            return;
        }
        
        if (todoVerileri[name]) {
            if (validationMsg) {
                validationMsg.innerText = activeLang === 'en' 
                    ? "A list with this name already exists." 
                    : "Bu isimde bir liste zaten mevcut.";
                validationMsg.style.display = 'block';
            }
            if (nameInput) {
                nameInput.style.borderColor = '#ef4444';
                nameInput.focus();
            }
            return;
        }
        
        todoVerileri[name] = {
            "todo": [],
            "progress": [],
            "done": [],
            "isChecklist": type === 'checklist'
        };
        aktifListeAdi = name;
        modal.style.display = 'none';
        resetValidation();
        todoHubYenile();
    };

    if (btnCreate) btnCreate.onclick = submitNewList;
    if (nameInput) {
        nameInput.oninput = resetValidation;
        nameInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitNewList();
            }
        };
    }

    // Inject Edit Card Modal HTML dynamically
    const editModalHTML = `
    <div id="gorev-detay-modal" class="modal-arkaplan" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center; font-family: sans-serif;">
        <div class="modal-kutu" style="background: var(--bg-card, #ffffff); padding: 25px; border-radius: 12px; max-width: 400px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); color: var(--text-color, #1e293b);">
            <h3 id="gd-modal-baslik" style="margin-top: 0; margin-bottom: 15px; color: var(--text-color, #1e293b);">${activeLang === 'en' ? 'Task Details & Reminder' : 'Görev Detayları & Hatırlatıcı'}</h3>
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; color: var(--text-color, #475569);">${activeLang === 'en' ? 'Task Description:' : 'Görev Başlığı:'}</label>
                    <input type="text" id="gd-input-text" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; box-sizing: border-box; outline: none; background: var(--bg-input, #fff); color: var(--text-color, #334155);">
                    <span id="gd-validation-msg" style="display: none; color: #ef4444; font-size: 11px; margin-top: 4px; font-weight: 600;"></span>
                </div>
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; color: var(--text-color, #475569);">${activeLang === 'en' ? 'Due Date:' : 'Son Teslim Tarihi:'}</label>
                    <input type="date" id="gd-input-date" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; box-sizing: border-box; outline: none; background: var(--bg-input, #fff); color: var(--text-color, #334155);">
                </div>
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; color: var(--text-color, #475569);">${activeLang === 'en' ? 'Due Time:' : 'Son Teslim Saati:'}</label>
                    <input type="time" id="gd-input-time" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; box-sizing: border-box; outline: none; background: var(--bg-input, #fff); color: var(--text-color, #334155);">
                </div>
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; color: var(--text-color, #475569);">${activeLang === 'en' ? 'Notes / Description:' : 'Açıklama / Detay:'}</label>
                    <textarea id="gd-input-desc" rows="3" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; box-sizing: border-box; outline: none; background: var(--bg-input, #fff); color: var(--text-color, #334155); resize: none; font-family: inherit; font-size: 13px;"></textarea>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                    <button id="gd-btn-cancel" style="background: #cbd5e1; color: #334155; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;">${activeLang === 'en' ? 'Cancel' : 'İptal'}</button>
                    <button id="gd-btn-save" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;">${activeLang === 'en' ? 'Save' : 'Kaydet'}</button>
                </div>
            </div>
        </div>
    </div>
    `;

    const editDiv = document.createElement('div');
    editDiv.innerHTML = editModalHTML;
    document.body.appendChild(editDiv.firstElementChild);

    const detailModal = document.getElementById('gorev-detay-modal');
    const gdBtnCancel = document.getElementById('gd-btn-cancel');
    const gdBtnSave = document.getElementById('gd-btn-save');
    const gdInputText = document.getElementById('gd-input-text');
    const gdInputDate = document.getElementById('gd-input-date');
    const gdInputTime = document.getElementById('gd-input-time');
    const gdInputDesc = document.getElementById('gd-input-desc');
    const gdValidationMsg = document.getElementById('gd-validation-msg');

    if (gdBtnCancel && detailModal) {
        gdBtnCancel.onclick = () => {
            detailModal.style.display = 'none';
        };
    }

    if (gdBtnSave && detailModal) {
        gdBtnSave.onclick = () => {
            const newText = gdInputText.value.trim();
            if (!newText) {
                if (gdValidationMsg) {
                    gdValidationMsg.innerText = activeLang === 'en' ? "This field is required!" : "Bu alanın doldurulması zorunludur!";
                    gdValidationMsg.style.display = 'block';
                }
                gdInputText.style.borderColor = '#ef4444';
                gdInputText.focus();
                return;
            }
            
            if (aktifDuzenlenenGorev) {
                aktifDuzenlenenGorev.txt = newText;
                aktifDuzenlenenGorev.dueDate = gdInputDate.value || null;
                aktifDuzenlenenGorev.dueTime = gdInputTime.value || null;
                aktifDuzenlenenGorev.desc = gdInputDesc.value || null;
                
                localStorage.setItem('hub_todo_hub_v2', JSON.stringify(todoVerileri));
                document.dispatchEvent(new CustomEvent('page_sync_update', {
                    detail: { key: 'hub_todo_hub_v2', value: JSON.stringify(todoVerileri) }
                }));
                
                todoHubYenile();
            }
            
            detailModal.style.display = 'none';
        };
    }

    todoHubYukle();
    todoHubYenile();
});
