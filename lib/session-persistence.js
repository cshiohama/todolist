const SeedData = require("./seed-data");
const deepCopy = require("./deep-copy");
const { sortTodoLists, sortTodos } = require("./sort");
const nextId = require("./next-id");

module.exports = class SessionPersistence {
  constructor(session) {
    this._todoLists = session.todoLists || deepCopy(SeedData);
    session.todoLists = this._todoLists;
  }
  
  isDoneTodoList(todoList) {
    return todoList.length > 0 && todoList.todos.every(todo => todo.done);
  }
  
  hasUndoneTodos(todoList) {
    return todoList.todos.some(todo => !todo.done);
  }
  
  sortedTodoLists() {
    let todoLists = deepCopy(this._todoLists);
    let undone = todoLists.filter(todoList => !this.isDoneTodoList(todoList));
    let done = todoLists.filter(todoList => this.isDoneTodoList(todoList));
    return sortTodoLists(undone, done);
  }
  
  sortedTodos(todoList) {
    let todos = todoList.todos;
    let undone = todos.filter(todo => !todo.done);
    let done = todos.filter(todo => todo.done);
    return deepCopy(sortTodos(undone, done));
  }
  
  // Find a todo list with the indicated ID. Returns `undefined` if not found.
  // Note that `todoListId` must be numeric.
  loadTodoList(todoListId) {
    let todoList = this._findTodoList(todoListId);
    return deepCopy(todoList);
  }
  
  // Find a todo with the indicated ID in the indicated todo list. Returns
  // `undefined` if not found. Note that both `todoListId` and `todoId` must be
  // numeric.
  loadTodo(todoListId, todoId) {
    let todo = this._findTodo(todoListId, todoId);
    return deepCopy(todo);
  }
  
  addTodo(todoListId, title) {
    let todoList = this._findTodoList(todoListId);
    if (!todoList) return false;
    
    todoList.todos.push({
      id: nextId(),
      title,
      done: false,
    });
  }
  
  editTodoListTitle(todoListId, title) {
    let todoList = this._findTodoList(todoListId);
    if (!todoList) return false;
    
    todoList.title = title;
    return true;
  }
    
  toggleDoneTodo(todoListId, todoId) {
    let todo = this._findTodo(todoListId, todoId);
    if (!todo) return false;
    
    todo.done = !todo.done;
    return true;
  }
  
  deleteTodo(todoListId, todoId) {
    let todoList = this._findTodoList(todoListId);
    if (!todoList) return false;
    let index;
    
    for (let i = 0; i < todoList.todos.length; i++) {
        if (todoList.todos[i].id === todoId)
          index = i;
    }
    
    if (index === undefined) return false;
    
    todoList.todos.splice(index, 1);
    return true;
  }
  
  deleteTodoList(todoListId) {
    let index = this._todoLists.findIndex(todoList => todoList.id === todoListId);
    
    if (index === -1) return false;
    
    this._todoLists.splice(index, 1);
    return true;
  }
  
  completeTodoList(todoListId) {
    let todoList = this._findTodoList(+todoListId);
    if (!todoList) return false;
    
    for (let todo of todoList.todos) {
      todo.done = true;
    }
    
    return true;
  }
  
  existsTodoListTitle(todoListTitle) {
    return this._todoLists.some(todo => todo.title === todoListTitle);
  }
  
  setTodoListTitle(todoListId, todoListTitle) {
    if (this.existsTodoListTitle(todoListTitle)) {
      return false;
    } else {
      let index = this._todoLists.findIndex(todo => todo.id === todoListId);
      this._todoLists[index].title = todoListTitle;
      return true;
    }
  }
  
  createTodoList(todoListTitle) {
    if (this.existsTodoListTitle(todoListTitle)) {
      return false;
    } else {
      this._todoLists.push({
        id: nextId(),
        title: todoListTitle,
        todos: [],
      });
      
      return true;
    }
  }
  
  _findTodoList(todoListId) {
    return this._todoLists.find(todoList => todoList.id === todoListId);
  }
  
  _findTodo(todoListId, todoId) {
    let todoList = this._findTodoList(todoListId);
    if (!todoList) return undefined;
    return todoList.todos.find(todo => todo.id === todoId);
  }
};