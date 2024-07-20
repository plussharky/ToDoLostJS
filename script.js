class Task {
    constructor(text, priority = 'medium', category = '', completed = false) {
        this.text = text;
        this.priority = priority;
        this.category = category;
        this.completed = completed;
        this.taskItem = null;

        TaskManager.taskStrorage.push(this);
    }

    createElement() {
        this.taskItem = document.createElement('li');
        this.taskItem.className = `task ${this.priority} ${this.category.name}`;
        if (this.completed) {
            this.taskItem.classList.add('completed');
        }
        this.taskItem.innerHTML = `
            <span class="taskText">${this.text}</span>
            <div>
                <select class='prioritySelector'>
                    ${Task.createOptionElements(this.priority)}
                </select>
                ${this.category ? `<span class='categoryLabel' style="background-color:${this.category.color}">${this.category.name}</span>` : ''}
                <button class="deleteTaskButton">Delete</button>
                <button class="editTaskButton">Edit</button>
            </div>
        `;

        Task.addEventListeners(this.taskItem);

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
        taskItem.querySelector('.prioritySelector').addEventListener('change', TaskManager.changePriority);
    }

    static toggleTask(event) {
        event.target.closest('li').classList.toggle('completed');
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

        const task = new Task(taskText, taskPriority, taskCategory);
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

    static editTask(taskItem) {
        this.editElement(
            { stopPropagation: () => {} },
            taskItem,
            'span',
            TaskManager.saveTasks
        );
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

    static editTask(event) {
        event.stopPropagation();
        const taskItem = event.target.closest('li');
        const taskSpan = taskItem.querySelector('span');
        const oldText = taskSpan.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = oldText;

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                taskSpan.textContent = input.value.trim();
                taskItem.replaceChild(taskSpan, input);
                this.saveTasks();
            }
        });

        taskItem.replaceChild(input, taskSpan);
        input.focus();

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

    static changePriority(event) {
        event.stopPropagation();
        const taskItem = event.target.closest('li');
        const newPriority = event.target.value;
        TaskManager.changeTaskPriority(taskItem, newPriority);
    }

    static changeTaskPriority(taskItem, newPriority) {
        Task.options.forEach(priority => taskItem.classList.remove(priority));
        taskItem.classList.add(newPriority);
        this.saveTasks();
    }

    static saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.taskStrorage));
    }

    static saveCategories() {
        localStorage.setItem('categories', JSON.stringify(this.categories));
    }

    static loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.forEach(taskData => {
            const task = new Task(taskData.text, taskData.priority, taskData.category, taskData.completed);
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
}

window.onload = () => TaskManager.initialization();