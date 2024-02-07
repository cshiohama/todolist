const { dbQuery } = require("./db-query");
const bcrypt = require("bcrypt");

module.exports = class PgPersistence {
  constructor(session) {
    this.username = session.username;
  }
  
  isDoneTodoList(todoList) {
    return todoList.todos.length > 0 && todoList.todos.every(todo => todo.done);
  }
  
  hasUndoneTodos(todoList) {
    return todoList.todos.some(todo => !todo.done);
  }
  
  // Find a todo with the indicated ID in the indicated todo list. Returns
  // `undefined` if not found. Note that both `todoListId` and `todoId` must be
  // numeric.
  async loadTodo(todoListId, todoId) {
    const FIND_TODO = 'SELECT * FROM todos ' +
                      'WHERE todolist_id = $1 ' +
                      'AND todos.id = $2 ' + 
                      'AND username = $3';
    
    let result = await dbQuery(FIND_TODO, todoListId, todoId, this.username);
    return result.rows[0];
  }

  // Find a todo list with the indicated ID. Returns `undefined` if not found.
  // Note that `todoListId` must be numeric.
  async loadTodoList(todoListId) {
    const FIND_TODOLIST = 'SELECT * FROM todolists WHERE id = $1 AND username = $2';
    const FIND_TODOS = 'SELECT * FROM todos WHERE todolist_id = $1 AND username = $2';

    let resultTodoList = await dbQuery(FIND_TODOLIST, todoListId, this.username);
    let resultTodos = await dbQuery(FIND_TODOS, todoListId, this.username);
    
    let todoList = resultTodoList.rows[0];
    if (!todoList) return undefined;
    
    todoList.todos = resultTodos.rows;
    return todoList;
  }

  async sortedTodos(todoList) {
    let todoListId = todoList.id;
    const FIND_TODOS = 'SELECT * FROM todos ' + 
                       'WHERE todolist_id = $1 ' +
                       'AND username = $2 ' +
                       'ORDER BY done, lower(title)';
    
    let result = await dbQuery(FIND_TODOS, todoListId, this.username);
    return result.rows;
  }

  async deleteTodo(todoListId, todoId) {
    const DELETE_TODO = 'DELETE FROM todos WHERE ' +
                        'todolist_id = $1 AND id = $2 AND username = $3';
    
    let result = await dbQuery(DELETE_TODO, todoListId, todoId, this.username);
    return result.rowCount > 0;
  }

  async completeTodoList(todoListId) {
    let todoList = await this.loadTodoList(todoListId);
    
    let COMPLETE_TODO = 'UPDATE todos SET done = true ' +
                        'WHERE todoList_id = $1 AND username = $2';
      
    let result = await dbQuery(COMPLETE_TODO, todoListId, this.username);                
    return result.rowCount > 0;
  }

  async createTodoList(todoListTitle) {
    const CREATE_TODO = 'INSERT INTO todolists (title, username) VALUES ($1, $2)';
    
    let result = await dbQuery(CREATE_TODO, todoListTitle, this.username);
    return result.rowCount > 0;
  }

  async addTodo(todoListId, title) {
    const ADD_TODO = 'INSERT INTO todos (todolist_id, title, username) VALUES ($1, $2, $3)';
    
    let result = await dbQuery(ADD_TODO, todoListId, title, this.username);
    return result.rowCount > 0;
  }

  async deleteTodoList(todoListId) {
    const DELETE_TODOLIST = 'DELETE FROM todolists WHERE id = $1 AND username = $2';
    
    let result = await dbQuery(DELETE_TODOLIST, todoListId, this.username);
    return result.rowCount > 0;
  }

  async toggleDoneTodo(todoListId, todoId) {
    const TOGGLE_DONE = 'UPDATE todos SET done = NOT done ' + 
                        'WHERE todolist_id = $1 AND id = $2 AND username = $3'
                        
    let result = await dbQuery(TOGGLE_DONE, todoListId, todoId, this.username);
    return result.rowCount > 0;
  }
  
  async sortedTodoLists() {
    const ALL_TODOLISTS = "SELECT * FROM todolists" +
                          "  WHERE username = $1" +
                          "  ORDER BY lower(title) ASC";
    const ALL_TODOS =     "SELECT * FROM todos" +
                          "  WHERE username = $1";
  
    let resultTodoLists = dbQuery(ALL_TODOLISTS, this.username);
    let resultTodos = dbQuery(ALL_TODOS, this.username);
    let resultBoth = await Promise.all([resultTodoLists, resultTodos]);
  
    let allTodoLists = resultBoth[0].rows;
    let allTodos = resultBoth[1].rows;
    if (!allTodoLists || !allTodos) return undefined;
  
    allTodoLists.forEach(todoList => {
      todoList.todos = allTodos.filter(todo => {
        return todoList.id === todo.todolist_id;
      });
    });
  
    return this._partitionTodoLists(allTodoLists);
  }
  
  async authenticate(username, password) {
    const FIND_HASHED_PASSWORD = 'SELECT password FROM users WHERE username = $1';
    
    let result = await dbQuery(FIND_HASHED_PASSWORD, username);
    if (result.rowCount === 0) return false;
    
    return bcrypt.compare(password, result.rows[0].password);
  }
  
  _partitionTodoLists(todoLists) {
    let done = [];
    let undone = [];
    
    for (let todoList of todoLists) {
      if (this.isDoneTodoList(todoList)) {
        done.push(todoList);
      } else {
        undone.push(todoList);
      }
    }
    
    return undone.concat(done);
  }
  
  // Returns a Promise that resolves to `true` if a todo list with the specified
  // title exists in the list of todo lists, `false` otherwise.
  async existsTodoListTitle(title) {
    const FIND_TODOLIST = "SELECT null FROM todolists WHERE title = $1 AND username = $2";

    let result = await dbQuery(FIND_TODOLIST, title, this.username);
    return result.rowCount > 0;
  }

  // Set a new title for the specified todo list. Returns a promise that
  // resolves to `true` on success, `false` if the todo list wasn't found.
  async setTodoListTitle(todoListId, title) {
    const UPDATE_TITLE = "UPDATE todolists SET title = $1 WHERE id = $2 AND username = $3";

    let result = await dbQuery(UPDATE_TITLE, title, todoListId, this.username);
    return result.rowCount > 0;
  }
};