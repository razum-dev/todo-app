// Конфигурация приложения
const config = {
    priorities: {
        low: { name: 'Низкий', color: '#2ECC71', hasDeadline: false },
        medium: { name: 'Средний', color: '#F1C40F', hasDeadline: true, days: 3 },
        high: { name: 'Высокий', color: '#E74C3C', hasDeadline: true, days: 1 }
    }
};

// State приложения
let taskCounter = 1;
let isEditingTitle = false;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    loadTitle();
    loadTasks();
    initEventListeners();
    updateTaskNumbers();
    loadTheme();
}

// Инициализация обработчиков событий
function initEventListeners() {
    // Кнопки header
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('deleteAllBtn').addEventListener('click', deleteAllTasks);
    document.getElementById('addTaskBtn').addEventListener('click', openAddModal);
    
    // Редактирование заголовка
    document.getElementById('projectTitle').addEventListener('dblclick', startEditingTitle);
    
    // Поиск
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Модальное окно
    document.getElementById('newTaskInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') confirmAddTask();
    });
    
    document.getElementById('cancelBtn').addEventListener('click', closeAddModal);
    document.getElementById('confirmAddBtn').addEventListener('click', confirmAddTask);
    
    // Закрытие модального окна
    document.addEventListener('click', function(event) {
        if (event.target.id === 'addTaskModal') {
            closeAddModal();
        }
    });
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeAddModal();
        }
    });
}

// Редактирование заголовка проекта
function startEditingTitle(event) {
    if (isEditingTitle) return;
    
    const titleElement = event.target;
    const originalText = titleElement.textContent;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'title-edit-input';
    input.style.cssText = `
        font-size: 32px;
        font-weight: 700;
        border: 2px solid #000;
        padding: 5px;
        border-radius: 5px;
        width: 100%;
        font-family: inherit;
    `;
    
    titleElement.replaceWith(input);
    input.focus();
    input.select();
    
    isEditingTitle = true;
    
    function finishEdit() {
        const newText = input.value.trim() || 'Project Name';
        const newTitle = document.createElement('h1');
        newTitle.textContent = newText;
        newTitle.id = 'projectTitle';
        newTitle.addEventListener('dblclick', startEditingTitle);
        
        input.replaceWith(newTitle);
        isEditingTitle = false;
        localStorage.setItem('projectTitle', newText);
    }
    
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') finishEdit();
    });
    
    input.addEventListener('blur', finishEdit);
    
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            input.value = originalText;
            finishEdit();
        }
    });
}

// Функции модального окна
function openAddModal() {
    document.getElementById('addTaskModal').style.display = 'block';
    document.getElementById('newTaskInput').focus();
}

function closeAddModal() {
    document.getElementById('addTaskModal').style.display = 'none';
    document.getElementById('newTaskInput').value = '';
}

function confirmAddTask() {
    const taskText = document.getElementById('newTaskInput').value.trim();
    const priority = document.getElementById('newTaskPriority').value;
    
    if (taskText) {
        addTask(taskText, priority);
        closeAddModal();
    }
}

// Добавление новой задачи
function addTask(text, priority = 'medium') {
    const task = {
        id: Date.now(),
        text: text,
        completed: false,
        priority: priority,
        createdAt: new Date().toISOString(),
        number: taskCounter++,
        deadline: calculateDeadline(priority)
    };
    
    const taskElement = createTaskElement(task);
    document.getElementById('taskList').appendChild(taskElement);
    saveTasks();
    updateTaskNumbers();
}

// Расчет дедлайна
function calculateDeadline(priority) {
    const priorityConfig = config.priorities[priority];
    if (!priorityConfig.hasDeadline) return null;
    
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + priorityConfig.days);
    return deadline.toISOString();
}

// Создание элемента задачи
function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.id = task.id;
    
    const isOverdue = task.deadline ? checkIfOverdue(task.deadline) : false;
    
    li.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <span class="task-number">${task.number.toString().padStart(2, '0')}</span>
        <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
        <div class="priority-dot priority-${task.priority}"></div>
        ${task.deadline ? `
            <span class="task-deadline ${isOverdue ? 'overdue' : ''}">
                До: ${formatDate(task.deadline)}
            </span>
        ` : ''}
        <div class="task-actions">
            <button class="edit-btn" onclick="editTask(${task.id})">✏️</button>
            <button class="delete-btn" onclick="removeTask(${task.id})">🗑️</button>
        </div>
    `;
    
    li.querySelector('.task-checkbox').addEventListener('change', function() {
        toggleTask(task.id, this.checked);
    });
    
    return li;
}

// Переключение статуса задачи
function toggleTask(taskId, completed) {
    const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
    if (taskElement) {
        taskElement.querySelector('.task-text').classList.toggle('completed', completed);
        updateTaskInStorage(taskId, { completed: completed });
    }
}

// Удаление задачи
function removeTask(taskId) {
    if (confirm('Удалить эту задачу?')) {
        const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
        if (taskElement) {
            taskElement.remove();
            removeTaskFromStorage(taskId);
            updateTaskNumbers();
        }
    }
}

// Редактирование задачи
function editTask(taskId) {
    const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
    const taskTextElement = taskElement.querySelector('.task-text');
    const originalText = taskTextElement.textContent;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'task-edit-input';
    
    taskTextElement.replaceWith(input);
    input.focus();
    input.select();
    
    function finishEdit() {
        const newText = input.value.trim() || originalText;
        taskTextElement.textContent = newText;
        input.replaceWith(taskTextElement);
        updateTaskInStorage(taskId, { text: newText });
    }
    
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') finishEdit();
    });
    
    input.addEventListener('blur', finishEdit);
    
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            input.value = originalText;
            finishEdit();
        }
    });
}

// Удаление всех задач
function deleteAllTasks() {
    if (confirm('Удалить ВСЕ задачи?')) {
        document.getElementById('taskList').innerHTML = '';
        localStorage.removeItem('tasks');
        taskCounter = 1;
        updateTaskNumbers();
    }
}

// Поиск задач
function handleSearch() {
    const searchText = this.value.toLowerCase();
    const tasks = document.querySelectorAll('.task-item');
    
    tasks.forEach(task => {
        const taskText = task.querySelector('.task-text').textContent.toLowerCase();
        task.style.display = taskText.includes(searchText) ? 'flex' : 'none';
    });
}

// Обновление номеров задач
function updateTaskNumbers() {
    const tasks = document.querySelectorAll('.task-item');
    let number = 1;
    tasks.forEach(task => {
        task.querySelector('.task-number').textContent = number.toString().padStart(2, '0');
        number++;
    });
    taskCounter = number;
}

// Проверка просроченности задачи
function checkIfOverdue(deadline) {
    return new Date() > new Date(deadline);
}

// Форматирование даты
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ru-RU');
}

// Работа с localStorage
function saveTasks() {
    const tasks = [];
    document.querySelectorAll('.task-item').forEach(taskElement => {
        tasks.push({
            id: taskElement.dataset.id,
            text: taskElement.querySelector('.task-text').textContent,
            completed: taskElement.querySelector('.task-checkbox').checked,
            priority: taskElement.querySelector('.priority-dot').className.split(' ')[1].replace('priority-', ''),
            createdAt: new Date().toISOString(),
            number: parseInt(taskElement.querySelector('.task-number').textContent)
        });
    });
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        tasks.forEach(task => {
            const taskElement = createTaskElement(task);
            document.getElementById('taskList').appendChild(taskElement);
        });
        updateTaskNumbers();
    }
}

function updateTaskInStorage(taskId, updates) {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        const taskIndex = tasks.findIndex(task => task.id == taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
            localStorage.setItem('tasks', JSON.stringify(tasks));
        }
    }
}

function removeTaskFromStorage(taskId) {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        let tasks = JSON.parse(savedTasks);
        tasks = tasks.filter(task => task.id != taskId);
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
}

// Переключение темы
function toggleTheme() {
    const body = document.body;
    const container = document.querySelector('.container');
    const themeToggle = document.getElementById('themeToggle');
    
    body.classList.toggle('dark-theme');
    container.classList.toggle('dark-theme');
    
    if (body.classList.contains('dark-theme')) {
        themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        themeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
}

// Загрузка темы
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        document.querySelector('.container').classList.add('dark-theme');
        document.getElementById('themeToggle').textContent = '☀️';
    }
}

// Загрузка заголовка
function loadTitle() {
    const savedTitle = localStorage.getItem('projectTitle');
    if (savedTitle) {
        document.getElementById('projectTitle').textContent = savedTitle;
    }
}

// Глобальные функции для onclick
window.editTask = editTask;
window.removeTask = removeTask;