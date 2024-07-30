function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class Task {
    static draggedElement = null;

    constructor(id, text, priority = 'medium', category = '', completed = false) {
        this.text = text;
        this.priority = priority;
        this.category = category;
        this.completed = completed;
        this.taskItem = null;
        this.id = id;
        if (!id) {
            this.id = TaskManager.getTaskGuid();
        } 
    }

    createElement() {
        this.taskItem = document.createElement('li');
        this.taskItem.className = `task ${this.priority} ${this.category.name}`;
        if (this.completed) {
            this.taskItem.classList.add('completed');
        }
        this.taskItem.innerHTML = `
            <span class="taskText">${this.text}</span>
            <span class="taskId hidden">${this.id}</span>
            <div class="taskProperties">
                <span class='priorityText'>${this.priority}</span>
                ${this.category ? `<span class='categoryLabel' style="background-color:${this.category.color}">${this.category.name}</span>` : ''}
                <button class="deleteTaskButton">Delete</button>
                <button class="editTaskButton">Edit</button>
            </div>
        `;
        this.taskItem.draggable = true;
        Task.addEventListeners(this.taskItem);
        Task.addDragEventListeners(this.taskItem);

        return this.taskItem;
    }

    static createOptionElements(selectedOption) {
        return TaskManager.options.map(option => {
            const selected = selectedOption === option ? 'selected' : '';
            return `<option value="${option}" ${selected}>${option.charAt(0).toUpperCase() + option.slice(1)}</option>`;
        }).join('');
    }

    static addEventListeners(taskItem) {
        taskItem.onclick = this.toggleTask;
        taskItem.querySelector('.deleteTaskButton').onclick = TaskManager.deleteTask;
        taskItem.querySelector('.editTaskButton').onclick = TaskManager.editTask;
        //taskItem.querySelector('.prioritySelector').addEventListener('change', TaskManager.changePriority);
    }

    static toggleTask(event) {
        let taskItem = event.target.closest('li');
        taskItem.classList.toggle('completed');
        const taskId = taskItem.querySelector('.taskId').textContent;
        let task = TaskManager.taskStrorage.find(task => task.id == taskId)
        task.completed = !task.completed;
        TaskManager.saveTasks();
    }

    static addDragEventListeners(taskItem) {
        taskItem.addEventListener('dragstart', Task.handleDragStart);
        taskItem.addEventListener('dragover', Task.handleDragOver);
        taskItem.addEventListener('drop', Task.handleDrop);
        taskItem.addEventListener('dragend', Task.handleDragEnd);
    }
    
    static handleDragStart(event) {
        event.target.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', event.target.innerHTML);
        Task.draggedElement = event.target;
    }
    
    static handleDragOver(event) {
        if (event.preventDefault) {
            event.preventDefault(); // необходимо для drop
        }
        event.dataTransfer.dropEffect = 'move';
        return false;
    }
    
    static handleDrop(event) {
        if (Task.draggedElement && Task.draggedElement !== event.target) {
            const taskList = Task.draggedElement.closest('ul');
            const tasks = Array.from(taskList.querySelectorAll('.task'));
            const draggedIndex = tasks.indexOf(Task.draggedElement);
            const targetIndex = tasks.indexOf(event.target);
    
            if (draggedIndex > -1 && targetIndex > -1) {
                taskList.removeChild(Task.draggedElement);
                if (draggedIndex > targetIndex) {
                    taskList.insertBefore(Task.draggedElement, event.target);
                } else {
                    taskList.insertBefore(Task.draggedElement, event.target.nextSibling);
                }
                TaskManager.saveTasks();
            }

            TaskManager.updateTaskOrder();
        }
    
        return false;
    }
    
    static handleDragEnd(event) {
        event.target.classList.remove('dragging');
        Task.draggedElement = null;
    }
}

class Category {
    constructor(name, color) {
        this.name = name;
        this.color = color;
    }

    static getRandomColor() {
        const randomChannel = () => Math.floor(Math.random() * 128 + 127); // 127-255 для светлых цветов
        const r = randomChannel();
        const g = randomChannel();
        const b = randomChannel();
        return `rgb(${r}, ${g}, ${b})`;
    }

    static createCategoryElement(category) {
        const categoryItem = document.createElement('li');
        categoryItem.className = 'category-item';
        categoryItem.innerHTML = `
            <span class="categoryLabel" style="background-color:${category.color}">${category.name}</span>
            <button class="editCategoryButton">Edit</button>
            <button class="deleteCategoryButton">Delete</button>
        `;

        categoryItem.querySelector('.editCategoryButton').onclick = () => TaskManager.editCategory(categoryItem, category);
        categoryItem.querySelector('.deleteCategoryButton').onclick = () => TaskManager.deleteCategory(category.name);

        return categoryItem;
    }
}

class TaskManager {
    static initialization() {
        this.taskInput = document.getElementById('taskInput');
        this.priorityInput = document.getElementById('priorityInput');
        this.categoryInput = document.getElementById('categoryInput');
        this.categoriesList = document.getElementById('categories');
        this.taskList = document.getElementById('taskList');
        this.addTaskButton = document.getElementById('addTaskButton');
        this.addTaskButton.onclick = () => this.addTask();

        this.newCategoryInput = document.getElementById('newCategoryInput');
        this.addCategoryButton = document.getElementById('addCategoryButton');
        this.categoryList = document.getElementById('categoryList');
        this.addCategoryButton.onclick = () => this.addCategory();

        this.toggleCategoryManagementButton = document.getElementById('toggleCategoryManagementButton');
        this.closeCategoryManagementButton = document.getElementById('closeCategoryManagementButton');
        this.overlay = document.getElementById('overlay');

        this.toggleCategoryManagementButton.onclick = () => this.toggleCategoryManagement();
        this.closeCategoryManagementButton.onclick = () => this.toggleCategoryManagement();
        this.overlay.onclick = () => this.toggleCategoryManagement();

        this.sortByCategoryButton = document.getElementById('sortByCategoryButton');
        this.sortByPriorityButton = document.getElementById('sortByPriorityButton');

        this.sortByCategoryButton.onclick = () => this.sortByCategory();
        this.sortByPriorityButton.onclick = () => this.sortByPriority();

        this.categories = [];
        this.taskStrorage = [];
        this.options = ['high', 'medium', 'low'];

        this.loadCategories();
        this.loadTasks();
    }

    static toggleCategoryManagement() {
        const categoryManagementDiv = document.getElementById('categoryManagement');
        const overlay = document.getElementById('overlay');
        const isHidden = categoryManagementDiv.style.display === 'none' || categoryManagementDiv.style.display === '';

        categoryManagementDiv.style.display = isHidden ? 'block' : 'none';
        overlay.style.display = isHidden ? 'block' : 'none';
    }

    static addTask() {
        const taskText = this.taskInput.value.trim();
        const taskPriority = this.priorityInput.value;
        const taskCategory = this.categories
            .find((cat) => cat.name == this.categoryInput.value.trim());

        if (taskText === '') return;

        this.addCategory(taskCategory);

        const task = new Task(null, taskText, taskPriority, taskCategory);
        TaskManager.taskStrorage.push(task);
        this.taskList.appendChild(task.createElement());

        this.resetInputs();
        this.saveTasks();
    }

    static addCategory() {
        const categoryName = this.newCategoryInput.value.trim();
        if (categoryName === '' || this.categories.find(cat => cat.name === categoryName)) return;

        const categoryColor = Category.getRandomColor();
        const newCategory = new Category(categoryName, categoryColor);
        this.categories.push(newCategory);

        const categoryElement = Category.createCategoryElement(newCategory);
        this.categoryList.appendChild(categoryElement);

        const option = document.createElement('option');
        option.value = categoryName;
        this.categoriesList.appendChild(option);

        this.newCategoryInput.value = '';
        this.saveCategories();
    }

    static editElement(event, element, selector, saveCallback) {
        event.stopPropagation();
        const span = element.querySelector(selector);
        const oldText = span.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = oldText;

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                span.textContent = input.value.trim();
                element.replaceChild(span, input);
                saveCallback();
            }
        });

        element.replaceChild(input, span);
        input.focus();
    }

    static editCategory(categoryItem, category) {
        this.editElement(
            { stopPropagation: () => {} },
            categoryItem,
            '.category-label',
            () => {
                const newCategoryName = categoryItem.querySelector('.category-label').textContent.trim();
                category.name = newCategoryName;
                this.saveCategories();
                this.loadCategories();
            }
        );
    }

    static editTask(event) {
        const taskItem = event.target.closest('li')

        TaskManager.editText(taskItem);
        TaskManager.editPriority(taskItem);
        TaskManager.editTaskCategory(taskItem);
    }

    static editText(taskItem) {
        const span = taskItem.querySelector('.taskText');
        const taskId = taskItem.querySelector('.taskId').textContent;
        const oldText = span.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = oldText;

        taskItem.replaceChild(input, span);
        input.focus();

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                taskItem.replaceChild(span, input);
                span.textContent = input.value.trim();
                let task = TaskManager.taskStrorage.find(task => task.id == taskId)
                task.text = input.value.trim();
                TaskManager.saveTasks();
            }
        });

        
    }

    static editTaskCategory(taskItem) {
        const propertiesElement = taskItem.querySelector('.taskProperties');
        const taskId = taskItem.querySelector('.taskId').textContent;
        const span = propertiesElement.querySelector('.categoryLabel');
        const oldText = span.textContent;
        const select = document.createElement('select');

        this.categories.forEach( category => {
            const optionElement = document.createElement('option');
            optionElement.value = category.name;
            optionElement.textContent = category.name;
            optionElement.style = `background-color:${category.color}`
            if (optionElement.textContent.toLowerCase() == oldText.toLowerCase()) {
                optionElement.selected = true;
            }
            select.appendChild(optionElement);
        })

        taskItem.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                propertiesElement.replaceChild(span, select);
                span.textContent = select.value.trim();
                const categoryColor = this.categories.find(category => category.name == select.value).color;
                span.style = `background-color:${categoryColor}`
                let task = TaskManager.taskStrorage.find(task => task.id == taskId)
                task.category = select.value.trim();
                TaskManager.saveTasks();
            }
        });
        
        propertiesElement.appendChild(select);
        propertiesElement.replaceChild(select, span);
    }

    static editPriority(taskItem) {
        const propertiesElement = taskItem.querySelector('.taskProperties');
        const taskId = taskItem.querySelector('.taskId').textContent;
        const span = propertiesElement.querySelector('span');
        const oldText = span.textContent;
        const select = document.createElement('select');
        select.classList.add('prioritySelector');

        this.options.forEach( option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option.charAt(0).toUpperCase() + option.slice(1);
            if (optionElement.textContent.toLowerCase() == oldText) {
                optionElement.selected = true;
            }
            select.appendChild(optionElement);
        })

        taskItem.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                propertiesElement.replaceChild(span, select);
                span.textContent = select.value.trim();
                let task = TaskManager.taskStrorage.find(task => task.id == taskId)
                task.priority = select.value.trim();
                TaskManager.saveTasks();
            }
        });

        propertiesElement.appendChild(select);
        propertiesElement.replaceChild(select, span);

        taskItem.querySelector('.prioritySelector').addEventListener('change', TaskManager.changePriority);
    }

    static deleteCategory(categoryName) {
        this.categories = this.categories.filter(cat => cat.name !== categoryName);
        this.saveCategories();
        this.loadCategories();
    }

    static resetInputs() {
        this.taskInput.value = '';
        this.priorityInput.value = 'medium';
        this.categoryInput.value = '';
    }

    static toggleTaskCompletion(event) {
        event.target.classList.toggle('completed');
        this.saveTasks();
    }

    static deleteTask(event) {
        event.stopPropagation();
        const taskItem = event.target.closest('li');
        TaskManager.taskStrorage = TaskManager.taskStrorage.filter(task => task.text !== taskItem.querySelector('.taskText').textContent)
        taskItem.remove();
        TaskManager.saveTasks();
    }

    static changePriority(event) {
        event.stopPropagation();
        const taskItem = event.target.closest('li');
        const newPriority = event.target.value;
        TaskManager.changeTaskPriority(taskItem, newPriority);
    }

    static changeTaskPriority(taskItem, newPriority) {
        TaskManager.options.forEach(priority => taskItem.classList.remove(priority));
        taskItem.classList.add(newPriority);
        this.saveTasks();
    }

    static saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(TaskManager.taskStrorage));
    }

    static saveCategories() {
        localStorage.setItem('categories', JSON.stringify(this.categories));
    }

    static loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.forEach(taskData => {
            const task = new Task(taskData.id ,taskData.text, taskData.priority, taskData.category, taskData.completed);
            this.taskList.appendChild(task.createElement());
            this.taskStrorage.push(task);
        });
    }

    static loadCategories() {
        const savedCategories = JSON.parse(localStorage.getItem('categories')) || [];
        this.categories = savedCategories.map(catData => new Category(catData.name, catData.color));

        this.categoryList.innerHTML = '';
        this.categoriesList.innerHTML = '';
        this.categories.forEach(category => {
            const categoryElement = Category.createCategoryElement(category);
            this.categoryList.appendChild(categoryElement);

            const option = document.createElement('option');
            option.value = category.name;
            this.categoriesList.appendChild(option);
        });
    }

    static sortByCategory() {
        this.taskStrorage.sort((a, b) => a.category.name.localeCompare(b.category.name));
        this.updateTaskList();
    }

    static sortByPriority() {
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        this.taskStrorage.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        this.updateTaskList();
    }

    static updateTaskList() {
        this.taskList.innerHTML = '';
        this.taskStrorage.forEach(task => {
            this.taskList.appendChild(task.createElement());
        });
    }

    static updateTaskOrder() {
        const taskItems = Array.from(this.taskList.querySelectorAll('.task'));
        this.taskStrorage = taskItems.map(taskItem => {
            const taskText = taskItem.querySelector('.taskText').textContent;
            return this.taskStrorage.find(task => task.text === taskText);
        });
        this.saveTasks();
    }

    static getTaskGuid() {
        let guid;
        while(!guid){
            let potensialGuid = generateGUID();
            guid = TaskManager.taskStrorage.some(task => task.id == potensialGuid) ? null : potensialGuid;
        }
        
        return guid;
    }
}

window.onload = () => TaskManager.initialization();