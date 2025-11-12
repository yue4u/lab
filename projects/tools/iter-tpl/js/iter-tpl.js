import { environment, exit as exit$1, stderr, stdin, stdout, terminalInput, terminalOutput, terminalStderr, terminalStdin, terminalStdout } from '@bytecodealliance/preview2-shim/cli';
import { monotonicClock, wallClock } from '@bytecodealliance/preview2-shim/clocks';
import { preopens, types } from '@bytecodealliance/preview2-shim/filesystem';
import { error, poll as poll$1, streams } from '@bytecodealliance/preview2-shim/io';
import { insecure, insecureSeed as insecureSeed$1, random } from '@bytecodealliance/preview2-shim/random';
import { instanceNetwork as instanceNetwork$1, ipNameLookup, network, tcp, tcpCreateSocket, udp, udpCreateSocket } from '@bytecodealliance/preview2-shim/sockets';
const { getArguments,
  getEnvironment,
  initialCwd } = environment;
const { exit } = exit$1;
const { getStderr } = stderr;
const { getStdin } = stdin;
const { getStdout } = stdout;
const { TerminalInput } = terminalInput;
const { TerminalOutput } = terminalOutput;
const { getTerminalStderr } = terminalStderr;
const { getTerminalStdin } = terminalStdin;
const { getTerminalStdout } = terminalStdout;
const { now,
  resolution,
  subscribeDuration,
  subscribeInstant } = monotonicClock;
const { now: now$1,
  resolution: resolution$1 } = wallClock;
const { getDirectories } = preopens;
const { Descriptor,
  DirectoryEntryStream,
  filesystemErrorCode } = types;
const { Error: Error$1 } = error;
const { Pollable,
  poll } = poll$1;
const { InputStream,
  OutputStream } = streams;
const { getInsecureRandomBytes,
  getInsecureRandomU64 } = insecure;
const { insecureSeed } = insecureSeed$1;
const { getRandomBytes,
  getRandomU64 } = random;
const { instanceNetwork } = instanceNetwork$1;
const { ResolveAddressStream,
  resolveAddresses } = ipNameLookup;
const { Network } = network;
const { TcpSocket } = tcp;
const { createTcpSocket } = tcpCreateSocket;
const { IncomingDatagramStream,
  OutgoingDatagramStream,
  UdpSocket } = udp;
const { createUdpSocket } = udpCreateSocket;

let dv = new DataView(new ArrayBuffer());
const dataView = mem => dv.buffer === mem.buffer ? dv : dv = new DataView(mem.buffer);

const toUint64 = val => BigInt.asUintN(64, BigInt(val));

function toUint16(val) {
  val >>>= 0;
  val %= 2 ** 16;
  return val;
}

function toUint32(val) {
  return val >>> 0;
}

function toUint8(val) {
  val >>>= 0;
  val %= 2 ** 8;
  return val;
}

const utf8Decoder = new TextDecoder();

const utf8Encoder = new TextEncoder();
let utf8EncodedLen = 0;
function utf8Encode(s, realloc, memory) {
  if (typeof s !== 'string') throw new TypeError('expected a string');
  if (s.length === 0) {
    utf8EncodedLen = 0;
    return 1;
  }
  let buf = utf8Encoder.encode(s);
  let ptr = realloc(0, 0, 1, buf.length);
  new Uint8Array(memory.buffer).set(buf, ptr);
  utf8EncodedLen = buf.length;
  return ptr;
}

const T_FLAG = 1 << 30;

function rscTableCreateOwn (table, rep) {
  const free = table[0] & ~T_FLAG;
  if (free === 0) {
    table.push(0);
    table.push(rep | T_FLAG);
    return (table.length >> 1) - 1;
  }
  table[0] = table[free << 1];
  table[free << 1] = 0;
  table[(free << 1) + 1] = rep | T_FLAG;
  return free;
}

function rscTableRemove (table, handle) {
  const scope = table[handle << 1];
  const val = table[(handle << 1) + 1];
  const own = (val & T_FLAG) !== 0;
  const rep = val & ~T_FLAG;
  if (val === 0 || (scope & T_FLAG) !== 0) throw new TypeError('Invalid handle');
  table[handle << 1] = table[0] | T_FLAG;
  table[0] = handle | T_FLAG;
  return { rep, scope, own };
}

let curResourceBorrows = [];

let NEXT_TASK_ID = 0n;
function startCurrentTask(componentIdx, isAsync, entryFnName) {
  _debugLog('[startCurrentTask()] args', { componentIdx, isAsync });
  if (componentIdx === undefined || componentIdx === null) {
    throw new Error('missing/invalid component instance index while starting task');
  }
  const tasks = ASYNC_TASKS_BY_COMPONENT_IDX.get(componentIdx);
  
  const nextId = ++NEXT_TASK_ID;
  const newTask = new AsyncTask({ id: nextId, componentIdx, isAsync, entryFnName });
  const newTaskMeta = { id: nextId, componentIdx, task: newTask };
  
  ASYNC_CURRENT_TASK_IDS.push(nextId);
  ASYNC_CURRENT_COMPONENT_IDXS.push(componentIdx);
  
  if (!tasks) {
    ASYNC_TASKS_BY_COMPONENT_IDX.set(componentIdx, [newTaskMeta]);
    return nextId;
  } else {
    tasks.push(newTaskMeta);
  }
  
  return nextId;
}

function endCurrentTask(componentIdx, taskId) {
  _debugLog('[endCurrentTask()] args', { componentIdx });
  componentIdx ??= ASYNC_CURRENT_COMPONENT_IDXS.at(-1);
  taskId ??= ASYNC_CURRENT_TASK_IDS.at(-1);
  if (componentIdx === undefined || componentIdx === null) {
    throw new Error('missing/invalid component instance index while ending current task');
  }
  const tasks = ASYNC_TASKS_BY_COMPONENT_IDX.get(componentIdx);
  if (!tasks || !Array.isArray(tasks)) {
    throw new Error('missing/invalid tasks for component instance while ending task');
  }
  if (tasks.length == 0) {
    throw new Error('no current task(s) for component instance while ending task');
  }
  
  if (taskId) {
    const last = tasks[tasks.length - 1];
    if (last.id !== taskId) {
      throw new Error('current task does not match expected task ID');
    }
  }
  
  ASYNC_CURRENT_TASK_IDS.pop();
  ASYNC_CURRENT_COMPONENT_IDXS.pop();
  
  return tasks.pop();
}
const ASYNC_TASKS_BY_COMPONENT_IDX = new Map();
const ASYNC_CURRENT_TASK_IDS = [];
const ASYNC_CURRENT_COMPONENT_IDXS = [];

class AsyncTask {
  static State = {
    INITIAL: 'initial',
    CANCELLED: 'cancelled',
    CANCEL_PENDING: 'cancel-pending',
    CANCEL_DELIVERED: 'cancel-delivered',
    RESOLVED: 'resolved',
  }
  
  static BlockResult = {
    CANCELLED: 'block.cancelled',
    NOT_CANCELLED: 'block.not-cancelled',
  }
  
  #id;
  #componentIdx;
  #state;
  #isAsync;
  #onResolve = null;
  #entryFnName = null;
  #subtasks = [];
  #completionPromise = null;
  
  cancelled = false;
  requested = false;
  alwaysTaskReturn = false;
  
  returnCalls =  0;
  storage = [0, 0];
  borrowedHandles = {};
  
  awaitableResume = null;
  awaitableCancel = null;
  
  
  constructor(opts) {
    if (opts?.id === undefined) { throw new TypeError('missing task ID during task creation'); }
    this.#id = opts.id;
    if (opts?.componentIdx === undefined) {
      throw new TypeError('missing component id during task creation');
    }
    this.#componentIdx = opts.componentIdx;
    this.#state = AsyncTask.State.INITIAL;
    this.#isAsync = opts?.isAsync ?? false;
    this.#entryFnName = opts.entryFnName;
    
    const {
      promise: completionPromise,
      resolve: resolveCompletionPromise,
      reject: rejectCompletionPromise,
    } = Promise.withResolvers();
    this.#completionPromise = completionPromise;
    
    this.#onResolve = (results) => {
      // TODO: handle external facing cancellation (should likely be a rejection)
      resolveCompletionPromise(results);
    }
  }
  
  taskState() { return this.#state.slice(); }
  id() { return this.#id; }
  componentIdx() { return this.#componentIdx; }
  isAsync() { return this.#isAsync; }
  entryFnName() { return this.#entryFnName; }
  completionPromise() { return this.#completionPromise; }
  
  mayEnter(task) {
    const cstate = getOrCreateAsyncState(this.#componentIdx);
    if (!cstate.backpressure) {
      _debugLog('[AsyncTask#mayEnter()] disallowed due to backpressure', { taskID: this.#id });
      return false;
    }
    if (!cstate.callingSyncImport()) {
      _debugLog('[AsyncTask#mayEnter()] disallowed due to sync import call', { taskID: this.#id });
      return false;
    }
    const callingSyncExportWithSyncPending = cstate.callingSyncExport && !task.isAsync;
    if (!callingSyncExportWithSyncPending) {
      _debugLog('[AsyncTask#mayEnter()] disallowed due to sync export w/ sync pending', { taskID: this.#id });
      return false;
    }
    return true;
  }
  
  async enter() {
    _debugLog('[AsyncTask#enter()] args', { taskID: this.#id });
    
    // TODO: assert scheduler locked
    // TODO: trap if on the stack
    
    const cstate = getOrCreateAsyncState(this.#componentIdx);
    
    let mayNotEnter = !this.mayEnter(this);
    const componentHasPendingTasks = cstate.pendingTasks > 0;
    if (mayNotEnter || componentHasPendingTasks) {
      throw new Error('in enter()'); // TODO: remove
      cstate.pendingTasks.set(this.#id, new Awaitable(new Promise()));
      
      const blockResult = await this.onBlock(awaitable);
      if (blockResult) {
        // TODO: find this pending task in the component
        const pendingTask = cstate.pendingTasks.get(this.#id);
        if (!pendingTask) {
          throw new Error('pending task [' + this.#id + '] not found for component instance');
        }
        cstate.pendingTasks.remove(this.#id);
        this.#onResolve(new Error('failed enter'));
        return false;
      }
      
      mayNotEnter = !this.mayEnter(this);
      if (!mayNotEnter || !cstate.startPendingTask) {
        throw new Error('invalid component entrance/pending task resolution');
      }
      cstate.startPendingTask = false;
    }
    
    if (!this.isAsync) { cstate.callingSyncExport = true; }
    
    return true;
  }
  
  async waitForEvent(opts) {
    const { waitableSetRep, isAsync } = opts;
    _debugLog('[AsyncTask#waitForEvent()] args', { taskID: this.#id, waitableSetRep, isAsync });
    
    if (this.#isAsync !== isAsync) {
      throw new Error('async waitForEvent called on non-async task');
    }
    
    if (this.status === AsyncTask.State.CANCEL_PENDING) {
      this.#state = AsyncTask.State.CANCEL_DELIVERED;
      return {
        code: ASYNC_EVENT_CODE.TASK_CANCELLED,
      };
    }
    
    const state = getOrCreateAsyncState(this.#componentIdx);
    const waitableSet = state.waitableSets.get(waitableSetRep);
    if (!waitableSet) { throw new Error('missing/invalid waitable set'); }
    
    waitableSet.numWaiting += 1;
    let event = null;
    
    while (event == null) {
      const awaitable = new Awaitable(waitableSet.getPendingEvent());
      const waited = await this.blockOn({ awaitable, isAsync, isCancellable: true });
      if (waited) {
        if (this.#state !== AsyncTask.State.INITIAL) {
          throw new Error('task should be in initial state found [' + this.#state + ']');
        }
        this.#state = AsyncTask.State.CANCELLED;
        return {
          code: ASYNC_EVENT_CODE.TASK_CANCELLED,
        };
      }
      
      event = waitableSet.poll();
    }
    
    waitableSet.numWaiting -= 1;
    return event;
  }
  
  waitForEventSync(opts) {
    throw new Error('AsyncTask#yieldSync() not implemented')
  }
  
  async pollForEvent(opts) {
    const { waitableSetRep, isAsync } = opts;
    _debugLog('[AsyncTask#pollForEvent()] args', { taskID: this.#id, waitableSetRep, isAsync });
    
    if (this.#isAsync !== isAsync) {
      throw new Error('async pollForEvent called on non-async task');
    }
    
    throw new Error('AsyncTask#pollForEvent() not implemented');
  }
  
  pollForEventSync(opts) {
    throw new Error('AsyncTask#yieldSync() not implemented')
  }
  
  async blockOn(opts) {
    const { awaitable, isCancellable, forCallback } = opts;
    _debugLog('[AsyncTask#blockOn()] args', { taskID: this.#id, awaitable, isCancellable, forCallback });
    
    if (awaitable.resolved() && !ASYNC_DETERMINISM && _coinFlip()) {
      return AsyncTask.BlockResult.NOT_CANCELLED;
    }
    
    const cstate = getOrCreateAsyncState(this.#componentIdx);
    if (forCallback) { cstate.exclusiveRelease(); }
    
    let cancelled = await this.onBlock(awaitable);
    if (cancelled === AsyncTask.BlockResult.CANCELLED && !isCancellable) {
      const secondCancel = await this.onBlock(awaitable);
      if (secondCancel !== AsyncTask.BlockResult.NOT_CANCELLED) {
        throw new Error('uncancellable task was canceled despite second onBlock()');
      }
    }
    
    if (forCallback) {
      const acquired = new Awaitable(cstate.exclusiveLock());
      cancelled = await this.onBlock(acquired);
      if (cancelled === AsyncTask.BlockResult.CANCELLED) {
        const secondCancel = await this.onBlock(acquired);
        if (secondCancel !== AsyncTask.BlockResult.NOT_CANCELLED) {
          throw new Error('uncancellable callback task was canceled despite second onBlock()');
        }
      }
    }
    
    if (cancelled === AsyncTask.BlockResult.CANCELLED) {
      if (this.#state !== AsyncTask.State.INITIAL) {
        throw new Error('cancelled task is not at initial state');
      }
      if (isCancellable) {
        this.#state = AsyncTask.State.CANCELLED;
        return AsyncTask.BlockResult.CANCELLED;
      } else {
        this.#state = AsyncTask.State.CANCEL_PENDING;
        return AsyncTask.BlockResult.NOT_CANCELLED;
      }
    }
    
    return AsyncTask.BlockResult.NOT_CANCELLED;
  }
  
  async onBlock(awaitable) {
    _debugLog('[AsyncTask#onBlock()] args', { taskID: this.#id, awaitable });
    if (!(awaitable instanceof Awaitable)) {
      throw new Error('invalid awaitable during onBlock');
    }
    
    // Build a promise that this task can await on which resolves when it is awoken
    const { promise, resolve, reject } = Promise.withResolvers();
    this.awaitableResume = () => {
      _debugLog('[AsyncTask] resuming after onBlock', { taskID: this.#id });
      resolve();
    };
    this.awaitableCancel = (err) => {
      _debugLog('[AsyncTask] rejecting after onBlock', { taskID: this.#id, err });
      reject(err);
    };
    
    // Park this task/execution to be handled later
    const state = getOrCreateAsyncState(this.#componentIdx);
    state.parkTaskOnAwaitable({ awaitable, task: this });
    
    try {
      await promise;
      return AsyncTask.BlockResult.NOT_CANCELLED;
    } catch (err) {
      // rejection means task cancellation
      return AsyncTask.BlockResult.CANCELLED;
    }
  }
  
  async asyncOnBlock(awaitable) {
    _debugLog('[AsyncTask#asyncOnBlock()] args', { taskID: this.#id, awaitable });
    if (!(awaitable instanceof Awaitable)) {
      throw new Error('invalid awaitable during onBlock');
    }
    // TODO: watch for waitable AND cancellation
    // TODO: if it WAS cancelled:
    // - return true
    // - only once per subtask
    // - do not wait on the scheduler
    // - control flow should go to the subtask (only once)
    // - Once subtask blocks/resolves, reqlinquishControl() will tehn resolve request_cancel_end (without scheduler lock release)
    // - control flow goes back to request_cancel
    //
    // Subtask cancellation should work similarly to an async import call -- runs sync up until
    // the subtask blocks or resolves
    //
    throw new Error('AsyncTask#asyncOnBlock() not yet implemented');
  }
  
  async yield(opts) {
    const { isCancellable, forCallback } = opts;
    _debugLog('[AsyncTask#yield()] args', { taskID: this.#id, isCancellable, forCallback });
    
    if (isCancellable && this.status === AsyncTask.State.CANCEL_PENDING) {
      this.#state = AsyncTask.State.CANCELLED;
      return {
        code: ASYNC_EVENT_CODE.TASK_CANCELLED,
        payload: [0, 0],
      };
    }
    
    // TODO: Awaitables need to *always* trigger the parking mechanism when they're done...?
    // TODO: Component async state should remember which awaitables are done and work to clear tasks waiting
    
    const blockResult = await this.blockOn({
      awaitable: new Awaitable(new Promise(resolve => setTimeout(resolve, 0))),
      isCancellable,
      forCallback,
    });
    
    if (blockResult === AsyncTask.BlockResult.CANCELLED) {
      if (this.#state !== AsyncTask.State.INITIAL) {
        throw new Error('task should be in initial state found [' + this.#state + ']');
      }
      this.#state = AsyncTask.State.CANCELLED;
      return {
        code: ASYNC_EVENT_CODE.TASK_CANCELLED,
        payload: [0, 0],
      };
    }
    
    return {
      code: ASYNC_EVENT_CODE.NONE,
      payload: [0, 0],
    };
  }
  
  yieldSync(opts) {
    throw new Error('AsyncTask#yieldSync() not implemented')
  }
  
  cancel() {
    _debugLog('[AsyncTask#cancel()] args', { });
    if (!this.taskState() !== AsyncTask.State.CANCEL_DELIVERED) {
      throw new Error('invalid task state for cancellation');
    }
    if (this.borrowedHandles.length > 0) { throw new Error('task still has borrow handles'); }
    
    this.#onResolve(new Error('cancelled'));
    this.#state = AsyncTask.State.RESOLVED;
  }
  
  resolve(results) {
    _debugLog('[AsyncTask#resolve()] args', { results });
    if (this.#state === AsyncTask.State.RESOLVED) {
      throw new Error('task is already resolved');
    }
    if (this.borrowedHandles.length > 0) { throw new Error('task still has borrow handles'); }
    this.#onResolve(results.length === 1 ? results[0] : results);
    this.#state = AsyncTask.State.RESOLVED;
  }
  
  exit() {
    _debugLog('[AsyncTask#exit()] args', { });
    
    // TODO: ensure there is only one task at a time (scheduler.lock() functionality)
    if (this.#state !== AsyncTask.State.RESOLVED) {
      throw new Error('task exited without resolution');
    }
    if (this.borrowedHandles > 0) {
      throw new Error('task exited without clearing borrowed handles');
    }
    
    const state = getOrCreateAsyncState(this.#componentIdx);
    if (!state) { throw new Error('missing async state for component [' + this.#componentIdx + ']'); }
    if (!this.#isAsync && !state.inSyncExportCall) {
      throw new Error('sync task must be run from components known to be in a sync export call');
    }
    state.inSyncExportCall = false;
    
    this.startPendingTask();
  }
  
  startPendingTask(args) {
    _debugLog('[AsyncTask#startPendingTask()] args', args);
    throw new Error('AsyncTask#startPendingTask() not implemented');
  }
  
  createSubtask(args) {
    _debugLog('[AsyncTask#createSubtask()] args', args);
    const newSubtask = new AsyncSubtask({
      componentIdx: this.componentIdx(),
      taskID: this.id(),
      memoryIdx: args?.memoryIdx,
    });
    this.#subtasks.push(newSubtask);
    return newSubtask;
  }
  
  currentSubtask() {
    _debugLog('[AsyncTask#currentSubtask()]');
    if (this.#subtasks.length === 0) { throw new Error('no current subtask'); }
    return this.#subtasks.at(-1);
  }
  
  endCurrentSubtask() {
    _debugLog('[AsyncTask#endCurrentSubtask()]');
    if (this.#subtasks.length === 0) { throw new Error('cannot end current subtask: no current subtask'); }
    const subtask = this.#subtasks.pop();
    subtask.drop();
    return subtask;
  }
}

function unpackCallbackResult(result) {
  _debugLog('[unpackCallbackResult()] args', { result });
  if (!(_typeCheckValidI32(result))) { throw new Error('invalid callback return value [' + result + '], not a valid i32'); }
  const eventCode = result & 0xF;
  if (eventCode < 0 || eventCode > 3) {
    throw new Error('invalid async return value [' + eventCode + '], outside callback code range');
  }
  if (result < 0 || result >= 2**32) { throw new Error('invalid callback result'); }
  // TODO: table max length check?
  const waitableSetIdx = result >> 4;
  return [eventCode, waitableSetIdx];
}
const ASYNC_STATE = new Map();

function getOrCreateAsyncState(componentIdx, init) {
  if (!ASYNC_STATE.has(componentIdx)) {
    ASYNC_STATE.set(componentIdx, new ComponentAsyncState());
  }
  return ASYNC_STATE.get(componentIdx);
}

class ComponentAsyncState {
  #callingAsyncImport = false;
  #syncImportWait = Promise.withResolvers();
  #lock = null;
  
  mayLeave = true;
  waitableSets = new RepTable();
  waitables = new RepTable();
  
  #parkedTasks = new Map();
  
  callingSyncImport(val) {
    if (val === undefined) { return this.#callingAsyncImport; }
    if (typeof val !== 'boolean') { throw new TypeError('invalid setting for async import'); }
    const prev = this.#callingAsyncImport;
    this.#callingAsyncImport = val;
    if (prev === true && this.#callingAsyncImport === false) {
      this.#notifySyncImportEnd();
    }
  }
  
  #notifySyncImportEnd() {
    const existing = this.#syncImportWait;
    this.#syncImportWait = Promise.withResolvers();
    existing.resolve();
  }
  
  async waitForSyncImportCallEnd() {
    await this.#syncImportWait.promise;
  }
  
  parkTaskOnAwaitable(args) {
    if (!args.awaitable) { throw new TypeError('missing awaitable when trying to park'); }
    if (!args.task) { throw new TypeError('missing task when trying to park'); }
    const { awaitable, task } = args;
    
    let taskList = this.#parkedTasks.get(awaitable.id());
    if (!taskList) {
      taskList = [];
      this.#parkedTasks.set(awaitable.id(), taskList);
    }
    taskList.push(task);
    
    this.wakeNextTaskForAwaitable(awaitable);
  }
  
  wakeNextTaskForAwaitable(awaitable) {
    if (!awaitable) { throw new TypeError('missing awaitable when waking next task'); }
    const awaitableID = awaitable.id();
    
    const taskList = this.#parkedTasks.get(awaitableID);
    if (!taskList || taskList.length === 0) {
      _debugLog('[ComponentAsyncState] no tasks waiting for awaitable', { awaitableID: awaitable.id() });
      return;
    }
    
    let task = taskList.shift(); // todo(perf)
    if (!task) { throw new Error('no task in parked list despite previous check'); }
    
    if (!task.awaitableResume) {
      throw new Error('task ready due to awaitable is missing resume', { taskID: task.id(), awaitableID });
    }
    task.awaitableResume();
  }
  
  async exclusiveLock() {  // TODO: use atomics
  if (this.#lock === null) {
    this.#lock = { ticket: 0n };
  }
  
  // Take a ticket for the next valid usage
  const ticket = ++this.#lock.ticket;
  
  _debugLog('[ComponentAsyncState#exclusiveLock()] locking', {
    currentTicket: ticket - 1n,
    ticket
  });
  
  // If there is an active promise, then wait for it
  let finishedTicket;
  while (this.#lock.promise) {
    finishedTicket = await this.#lock.promise;
    if (finishedTicket === ticket - 1n) { break; }
  }
  
  const { promise, resolve } = Promise.withResolvers();
  this.#lock = {
    ticket,
    promise,
    resolve,
  };
  
  return this.#lock.promise;
}

exclusiveRelease() {
  _debugLog('[ComponentAsyncState#exclusiveRelease()] releasing', {
    currentTicket: this.#lock === null ? 'none' : this.#lock.ticket,
  });
  
  if (this.#lock === null) { return; }
  
  const existingLock = this.#lock;
  this.#lock = null;
  existingLock.resolve(existingLock.ticket);
}

isExclusivelyLocked() { return this.#lock !== null; }

}

function prepareCall(memoryIdx) {
  _debugLog('[prepareCall()] args', { memoryIdx });
  
  const taskMeta = getCurrentTask(ASYNC_CURRENT_COMPONENT_IDXS.at(-1), ASYNC_CURRENT_TASK_IDS.at(-1));
  if (!taskMeta) { throw new Error('invalid/missing current async task meta during prepare call'); }
  
  const task = taskMeta.task;
  if (!task) { throw new Error('unexpectedly missing task in task meta during prepare call'); }
  
  const state = getOrCreateAsyncState(task.componentIdx());
  if (!state) {
    throw new Error('invalid/missing async state for component instance [' + componentInstanceID + ']');
  }
  
  const subtask = task.createSubtask({
    memoryIdx,
  });
  
}

function asyncStartCall(callbackIdx, postReturnIdx) {
  _debugLog('[asyncStartCall()] args', { callbackIdx, postReturnIdx });
  
  const taskMeta = getCurrentTask(ASYNC_CURRENT_COMPONENT_IDXS.at(-1), ASYNC_CURRENT_TASK_IDS.at(-1));
  if (!taskMeta) { throw new Error('invalid/missing current async task meta during prepare call'); }
  
  const task = taskMeta.task;
  if (!task) { throw new Error('unexpectedly missing task in task meta during prepare call'); }
  
  const subtask = task.currentSubtask();
  if (!subtask) { throw new Error('invalid/missing subtask during async start call'); }
  
  return Number(subtask.waitableRep()) << 4 | subtask.getStateNumber();
}

function syncStartCall(callbackIdx) {
  _debugLog('[syncStartCall()] args', { callbackIdx });
}

if (!Promise.withResolvers) {
  Promise.withResolvers = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

const _debugLog = (...args) => {
  if (!globalThis?.process?.env?.JCO_DEBUG) { return; }
  console.debug(...args);
}
const ASYNC_DETERMINISM = 'random';
const _coinFlip = () => { return Math.random() > 0.5; };
const I32_MAX = 2_147_483_647;
const I32_MIN = -2_147_483_648;
const _typeCheckValidI32 = (n) => typeof n === 'number' && n >= I32_MIN && n <= I32_MAX;

const base64Compile = str => WebAssembly.compile(typeof Buffer !== 'undefined' ? Buffer.from(str, 'base64') : Uint8Array.from(atob(str), b => b.charCodeAt(0)));

function clampGuest(i, min, max) {
  if (i < min || i > max) throw new TypeError(`must be between ${min} and ${max}`);
  return i;
}

const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
let _fs;
async function fetchCompile (url) {
  if (isNode) {
    _fs = _fs || await import('node:fs/promises');
    return WebAssembly.compile(await _fs.readFile(url));
  }
  return fetch(url).then(WebAssembly.compileStreaming);
}

const symbolCabiDispose = Symbol.for('cabiDispose');

const symbolRscHandle = Symbol('handle');

const symbolRscRep = Symbol.for('cabiRep');

const symbolDispose = Symbol.dispose || Symbol.for('dispose');

const handleTables = [];

class ComponentError extends Error {
  constructor (value) {
    const enumerable = typeof value !== 'string';
    super(enumerable ? `${String(value)} (see error.payload)` : value);
    Object.defineProperty(this, 'payload', { value, enumerable });
  }
}

function getErrorPayload(e) {
  if (e && hasOwnProperty.call(e, 'payload')) return e.payload;
  if (e instanceof Error) throw e;
  return e;
}

class RepTable {
  #data = [0, null];
  
  insert(val) {
    _debugLog('[RepTable#insert()] args', { val });
    const freeIdx = this.#data[0];
    if (freeIdx === 0) {
      this.#data.push(val);
      this.#data.push(null);
      return (this.#data.length >> 1) - 1;
    }
    this.#data[0] = this.#data[freeIdx << 1];
    const placementIdx = freeIdx << 1;
    this.#data[placementIdx] = val;
    this.#data[placementIdx + 1] = null;
    return freeIdx;
  }
  
  get(rep) {
    _debugLog('[RepTable#get()] args', { rep });
    const baseIdx = rep << 1;
    const val = this.#data[baseIdx];
    return val;
  }
  
  contains(rep) {
    _debugLog('[RepTable#contains()] args', { rep });
    const baseIdx = rep << 1;
    return !!this.#data[baseIdx];
  }
  
  remove(rep) {
    _debugLog('[RepTable#remove()] args', { rep });
    if (this.#data.length === 2) { throw new Error('invalid'); }
    
    const baseIdx = rep << 1;
    const val = this.#data[baseIdx];
    if (val === 0) { throw new Error('invalid resource rep (cannot be 0)'); }
    
    this.#data[baseIdx] = this.#data[0];
    this.#data[0] = rep;
    
    return val;
  }
  
  clear() {
    _debugLog('[RepTable#clear()] args', { rep });
    this.#data = [0, null];
  }
}

function throwInvalidBool() {
  throw new TypeError('invalid variant discriminant for bool');
}

const hasOwnProperty = Object.prototype.hasOwnProperty;

const instantiateCore = WebAssembly.instantiate;


let exports0;
const handleTable15 = [T_FLAG, 0];
const captureTable3= new Map();
let captureCnt3 = 0;
handleTables[15] = handleTable15;

function trampoline2() {
  _debugLog('[iface="wasi:cli/stdout@0.2.0", function="get-stdout"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, 'get-stdout');
  const ret = getStdout();
  _debugLog('[iface="wasi:cli/stdout@0.2.0", function="get-stdout"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(1);
  if (!(ret instanceof OutputStream)) {
    throw new TypeError('Resource error: Not a valid "OutputStream" resource.');
  }
  var handle0 = ret[symbolRscHandle];
  if (!handle0) {
    const rep = ret[symbolRscRep] || ++captureCnt3;
    captureTable3.set(rep, ret);
    handle0 = rscTableCreateOwn(handleTable15, rep);
  }
  _debugLog('[iface="wasi:cli/stdout@0.2.0", function="get-stdout"][Instruction::Return]', {
    funcName: 'get-stdout',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle0;
}


function trampoline3() {
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="now"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, 'now');
  const ret = now();
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="now"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(1);
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="now"][Instruction::Return]', {
    funcName: 'now',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return toUint64(ret);
}


function trampoline4() {
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-u64"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, 'get-random-u64');
  const ret = getRandomU64();
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-u64"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(1);
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-u64"][Instruction::Return]', {
    funcName: 'get-random-u64',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return toUint64(ret);
}


function trampoline5() {
  _debugLog('[iface="wasi:cli/stderr@0.2.0", function="get-stderr"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, 'get-stderr');
  const ret = getStderr();
  _debugLog('[iface="wasi:cli/stderr@0.2.0", function="get-stderr"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(1);
  if (!(ret instanceof OutputStream)) {
    throw new TypeError('Resource error: Not a valid "OutputStream" resource.');
  }
  var handle0 = ret[symbolRscHandle];
  if (!handle0) {
    const rep = ret[symbolRscRep] || ++captureCnt3;
    captureTable3.set(rep, ret);
    handle0 = rscTableCreateOwn(handleTable15, rep);
  }
  _debugLog('[iface="wasi:cli/stderr@0.2.0", function="get-stderr"][Instruction::Return]', {
    funcName: 'get-stderr',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle0;
}

const handleTable14 = [T_FLAG, 0];
const captureTable2= new Map();
let captureCnt2 = 0;
handleTables[14] = handleTable14;

function trampoline6() {
  _debugLog('[iface="wasi:cli/stdin@0.2.0", function="get-stdin"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, 'get-stdin');
  const ret = getStdin();
  _debugLog('[iface="wasi:cli/stdin@0.2.0", function="get-stdin"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(1);
  if (!(ret instanceof InputStream)) {
    throw new TypeError('Resource error: Not a valid "InputStream" resource.');
  }
  var handle0 = ret[symbolRscHandle];
  if (!handle0) {
    const rep = ret[symbolRscRep] || ++captureCnt2;
    captureTable2.set(rep, ret);
    handle0 = rscTableCreateOwn(handleTable14, rep);
  }
  _debugLog('[iface="wasi:cli/stdin@0.2.0", function="get-stdin"][Instruction::Return]', {
    funcName: 'get-stdin',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle0;
}

let exports1;
let memory0;
let realloc0;

function trampoline9(arg0) {
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-environment"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, 'get-environment');
  const ret = getEnvironment();
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-environment"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(1);
  var vec3 = ret;
  var len3 = vec3.length;
  var result3 = realloc0(0, 0, 4, len3 * 16);
  for (let i = 0; i < vec3.length; i++) {
    const e = vec3[i];
    const base = result3 + i * 16;var [tuple0_0, tuple0_1] = e;
    var ptr1 = utf8Encode(tuple0_0, realloc0, memory0);
    var len1 = utf8EncodedLen;
    dataView(memory0).setUint32(base + 4, len1, true);
    dataView(memory0).setUint32(base + 0, ptr1, true);
    var ptr2 = utf8Encode(tuple0_1, realloc0, memory0);
    var len2 = utf8EncodedLen;
    dataView(memory0).setUint32(base + 12, len2, true);
    dataView(memory0).setUint32(base + 8, ptr2, true);
  }
  dataView(memory0).setUint32(arg0 + 4, len3, true);
  dataView(memory0).setUint32(arg0 + 0, result3, true);
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-environment"][Instruction::Return]', {
    funcName: 'get-environment',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline10(arg0) {
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-arguments"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, 'get-arguments');
  const ret = getArguments();
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-arguments"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(1);
  var vec1 = ret;
  var len1 = vec1.length;
  var result1 = realloc0(0, 0, 4, len1 * 8);
  for (let i = 0; i < vec1.length; i++) {
    const e = vec1[i];
    const base = result1 + i * 8;var ptr0 = utf8Encode(e, realloc0, memory0);
    var len0 = utf8EncodedLen;
    dataView(memory0).setUint32(base + 4, len0, true);
    dataView(memory0).setUint32(base + 0, ptr0, true);
  }
  dataView(memory0).setUint32(arg0 + 4, len1, true);
  dataView(memory0).setUint32(arg0 + 0, result1, true);
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-arguments"][Instruction::Return]', {
    funcName: 'get-arguments',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline11(arg0) {
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="initial-cwd"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, 'initial-cwd');
  const ret = initialCwd();
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="initial-cwd"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(1);
  var variant1 = ret;
  if (variant1 === null || variant1=== undefined) {
    dataView(memory0).setInt8(arg0 + 0, 0, true);
  } else {
    const e = variant1;
    dataView(memory0).setInt8(arg0 + 0, 1, true);
    var ptr0 = utf8Encode(e, realloc0, memory0);
    var len0 = utf8EncodedLen;
    dataView(memory0).setUint32(arg0 + 8, len0, true);
    dataView(memory0).setUint32(arg0 + 4, ptr0, true);
  }
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="initial-cwd"][Instruction::Return]', {
    funcName: 'initial-cwd',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}

const handleTable18 = [T_FLAG, 0];
const captureTable0= new Map();
let captureCnt0 = 0;
handleTables[18] = handleTable18;

function trampoline12(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable14[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable2.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(InputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.blocking-read"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]input-stream.blocking-read');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.blockingRead(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.blocking-read"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory0).setInt8(arg2 + 0, 0, true);
      var val3 = e;
      var len3 = val3.byteLength;
      var ptr3 = realloc0(0, 0, 1, len3 * 1);
      var src3 = new Uint8Array(val3.buffer || val3, val3.byteOffset, len3 * 1);
      (new Uint8Array(memory0.buffer, ptr3, len3 * 1)).set(src3);
      dataView(memory0).setUint32(arg2 + 8, len3, true);
      dataView(memory0).setUint32(arg2 + 4, ptr3, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory0).setInt8(arg2 + 0, 1, true);
      var variant5 = e;
      switch (variant5.tag) {
        case 'last-operation-failed': {
          const e = variant5.val;
          dataView(memory0).setInt8(arg2 + 4, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle4 = e[symbolRscHandle];
          if (!handle4) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle4 = rscTableCreateOwn(handleTable18, rep);
          }
          dataView(memory0).setInt32(arg2 + 8, handle4, true);
          break;
        }
        case 'closed': {
          dataView(memory0).setInt8(arg2 + 4, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.blocking-read"][Instruction::Return]', {
    funcName: '[method]input-stream.blocking-read',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline13(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable15[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable3.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-flush"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]output-stream.blocking-flush');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.blockingFlush()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-flush"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory0).setInt8(arg1 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory0).setInt8(arg1 + 0, 1, true);
      var variant4 = e;
      switch (variant4.tag) {
        case 'last-operation-failed': {
          const e = variant4.val;
          dataView(memory0).setInt8(arg1 + 4, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle3 = e[symbolRscHandle];
          if (!handle3) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle3 = rscTableCreateOwn(handleTable18, rep);
          }
          dataView(memory0).setInt32(arg1 + 8, handle3, true);
          break;
        }
        case 'closed': {
          dataView(memory0).setInt8(arg1 + 4, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant4.tag)}\` (received \`${variant4}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-flush"][Instruction::Return]', {
    funcName: '[method]output-stream.blocking-flush',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline14(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable15[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable3.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = new Uint8Array(memory0.buffer.slice(ptr3, ptr3 + len3 * 1));
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-write-and-flush"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]output-stream.blocking-write-and-flush');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.blockingWriteAndFlush(result3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-write-and-flush"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory0).setInt8(arg3 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory0).setInt8(arg3 + 0, 1, true);
      var variant5 = e;
      switch (variant5.tag) {
        case 'last-operation-failed': {
          const e = variant5.val;
          dataView(memory0).setInt8(arg3 + 4, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle4 = e[symbolRscHandle];
          if (!handle4) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle4 = rscTableCreateOwn(handleTable18, rep);
          }
          dataView(memory0).setInt32(arg3 + 8, handle4, true);
          break;
        }
        case 'closed': {
          dataView(memory0).setInt8(arg3 + 4, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-write-and-flush"][Instruction::Return]', {
    funcName: '[method]output-stream.blocking-write-and-flush',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline15(arg0) {
  _debugLog('[iface="wasi:clocks/wall-clock@0.2.0", function="now"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, 'now');
  const ret = now$1();
  _debugLog('[iface="wasi:clocks/wall-clock@0.2.0", function="now"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(1);
  var {seconds: v0_0, nanoseconds: v0_1 } = ret;
  dataView(memory0).setBigInt64(arg0 + 0, toUint64(v0_0), true);
  dataView(memory0).setInt32(arg0 + 8, toUint32(v0_1), true);
  _debugLog('[iface="wasi:clocks/wall-clock@0.2.0", function="now"][Instruction::Return]', {
    funcName: 'now',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline16(arg0, arg1) {
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-bytes"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, 'get-random-bytes');
  const ret = getRandomBytes(BigInt.asUintN(64, arg0));
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-bytes"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(1);
  var val0 = ret;
  var len0 = val0.byteLength;
  var ptr0 = realloc0(0, 0, 1, len0 * 1);
  var src0 = new Uint8Array(val0.buffer || val0, val0.byteOffset, len0 * 1);
  (new Uint8Array(memory0.buffer, ptr0, len0 * 1)).set(src0);
  dataView(memory0).setUint32(arg1 + 4, len0, true);
  dataView(memory0).setUint32(arg1 + 0, ptr0, true);
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-bytes"][Instruction::Return]', {
    funcName: 'get-random-bytes',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}

const handleTable16 = [T_FLAG, 0];
const captureTable4= new Map();
let captureCnt4 = 0;
handleTables[16] = handleTable16;

function trampoline17(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable16[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.create-directory-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]descriptor.create-directory-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.createDirectoryAt(result3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.create-directory-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory0).setInt8(arg3 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory0).setInt8(arg3 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg3 + 1, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.create-directory-at"][Instruction::Return]', {
    funcName: '[method]descriptor.create-directory-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline18(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
  var handle1 = arg0;
  var rep2 = handleTable16[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  if ((arg1 & 4294967294) !== 0) {
    throw new TypeError('flags have extraneous bits set');
  }
  var flags3 = {
    symlinkFollow: Boolean(arg1 & 1),
  };
  var ptr4 = arg2;
  var len4 = arg3;
  var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
  var handle6 = arg4;
  var rep7 = handleTable16[(handle6 << 1) + 1] & ~T_FLAG;
  var rsc5 = captureTable4.get(rep7);
  if (!rsc5) {
    rsc5 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc5, symbolRscHandle, { writable: true, value: handle6});
    Object.defineProperty(rsc5, symbolRscRep, { writable: true, value: rep7});
  }
  curResourceBorrows.push(rsc5);
  var ptr8 = arg5;
  var len8 = arg6;
  var result8 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr8, len8));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.link-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]descriptor.link-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.linkAt(flags3, result4, rsc5, result8)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.link-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant10 = ret;
  switch (variant10.tag) {
    case 'ok': {
      const e = variant10.val;
      dataView(memory0).setInt8(arg7 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant10.val;
      dataView(memory0).setInt8(arg7 + 0, 1, true);
      var val9 = e;
      let enum9;
      switch (val9) {
        case 'access': {
          enum9 = 0;
          break;
        }
        case 'would-block': {
          enum9 = 1;
          break;
        }
        case 'already': {
          enum9 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum9 = 3;
          break;
        }
        case 'busy': {
          enum9 = 4;
          break;
        }
        case 'deadlock': {
          enum9 = 5;
          break;
        }
        case 'quota': {
          enum9 = 6;
          break;
        }
        case 'exist': {
          enum9 = 7;
          break;
        }
        case 'file-too-large': {
          enum9 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum9 = 9;
          break;
        }
        case 'in-progress': {
          enum9 = 10;
          break;
        }
        case 'interrupted': {
          enum9 = 11;
          break;
        }
        case 'invalid': {
          enum9 = 12;
          break;
        }
        case 'io': {
          enum9 = 13;
          break;
        }
        case 'is-directory': {
          enum9 = 14;
          break;
        }
        case 'loop': {
          enum9 = 15;
          break;
        }
        case 'too-many-links': {
          enum9 = 16;
          break;
        }
        case 'message-size': {
          enum9 = 17;
          break;
        }
        case 'name-too-long': {
          enum9 = 18;
          break;
        }
        case 'no-device': {
          enum9 = 19;
          break;
        }
        case 'no-entry': {
          enum9 = 20;
          break;
        }
        case 'no-lock': {
          enum9 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum9 = 22;
          break;
        }
        case 'insufficient-space': {
          enum9 = 23;
          break;
        }
        case 'not-directory': {
          enum9 = 24;
          break;
        }
        case 'not-empty': {
          enum9 = 25;
          break;
        }
        case 'not-recoverable': {
          enum9 = 26;
          break;
        }
        case 'unsupported': {
          enum9 = 27;
          break;
        }
        case 'no-tty': {
          enum9 = 28;
          break;
        }
        case 'no-such-device': {
          enum9 = 29;
          break;
        }
        case 'overflow': {
          enum9 = 30;
          break;
        }
        case 'not-permitted': {
          enum9 = 31;
          break;
        }
        case 'pipe': {
          enum9 = 32;
          break;
        }
        case 'read-only': {
          enum9 = 33;
          break;
        }
        case 'invalid-seek': {
          enum9 = 34;
          break;
        }
        case 'text-file-busy': {
          enum9 = 35;
          break;
        }
        case 'cross-device': {
          enum9 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val9}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg7 + 1, enum9, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.link-at"][Instruction::Return]', {
    funcName: '[method]descriptor.link-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline19(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
  var handle1 = arg0;
  var rep2 = handleTable16[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  if ((arg1 & 4294967294) !== 0) {
    throw new TypeError('flags have extraneous bits set');
  }
  var flags3 = {
    symlinkFollow: Boolean(arg1 & 1),
  };
  var ptr4 = arg2;
  var len4 = arg3;
  var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
  if ((arg4 & 4294967280) !== 0) {
    throw new TypeError('flags have extraneous bits set');
  }
  var flags5 = {
    create: Boolean(arg4 & 1),
    directory: Boolean(arg4 & 2),
    exclusive: Boolean(arg4 & 4),
    truncate: Boolean(arg4 & 8),
  };
  if ((arg5 & 4294967232) !== 0) {
    throw new TypeError('flags have extraneous bits set');
  }
  var flags6 = {
    read: Boolean(arg5 & 1),
    write: Boolean(arg5 & 2),
    fileIntegritySync: Boolean(arg5 & 4),
    dataIntegritySync: Boolean(arg5 & 8),
    requestedWriteSync: Boolean(arg5 & 16),
    mutateDirectory: Boolean(arg5 & 32),
  };
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.open-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]descriptor.open-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.openAt(flags3, result4, flags5, flags6)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.open-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant9 = ret;
  switch (variant9.tag) {
    case 'ok': {
      const e = variant9.val;
      dataView(memory0).setInt8(arg6 + 0, 0, true);
      if (!(e instanceof Descriptor)) {
        throw new TypeError('Resource error: Not a valid "Descriptor" resource.');
      }
      var handle7 = e[symbolRscHandle];
      if (!handle7) {
        const rep = e[symbolRscRep] || ++captureCnt4;
        captureTable4.set(rep, e);
        handle7 = rscTableCreateOwn(handleTable16, rep);
      }
      dataView(memory0).setInt32(arg6 + 4, handle7, true);
      break;
    }
    case 'err': {
      const e = variant9.val;
      dataView(memory0).setInt8(arg6 + 0, 1, true);
      var val8 = e;
      let enum8;
      switch (val8) {
        case 'access': {
          enum8 = 0;
          break;
        }
        case 'would-block': {
          enum8 = 1;
          break;
        }
        case 'already': {
          enum8 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum8 = 3;
          break;
        }
        case 'busy': {
          enum8 = 4;
          break;
        }
        case 'deadlock': {
          enum8 = 5;
          break;
        }
        case 'quota': {
          enum8 = 6;
          break;
        }
        case 'exist': {
          enum8 = 7;
          break;
        }
        case 'file-too-large': {
          enum8 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum8 = 9;
          break;
        }
        case 'in-progress': {
          enum8 = 10;
          break;
        }
        case 'interrupted': {
          enum8 = 11;
          break;
        }
        case 'invalid': {
          enum8 = 12;
          break;
        }
        case 'io': {
          enum8 = 13;
          break;
        }
        case 'is-directory': {
          enum8 = 14;
          break;
        }
        case 'loop': {
          enum8 = 15;
          break;
        }
        case 'too-many-links': {
          enum8 = 16;
          break;
        }
        case 'message-size': {
          enum8 = 17;
          break;
        }
        case 'name-too-long': {
          enum8 = 18;
          break;
        }
        case 'no-device': {
          enum8 = 19;
          break;
        }
        case 'no-entry': {
          enum8 = 20;
          break;
        }
        case 'no-lock': {
          enum8 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum8 = 22;
          break;
        }
        case 'insufficient-space': {
          enum8 = 23;
          break;
        }
        case 'not-directory': {
          enum8 = 24;
          break;
        }
        case 'not-empty': {
          enum8 = 25;
          break;
        }
        case 'not-recoverable': {
          enum8 = 26;
          break;
        }
        case 'unsupported': {
          enum8 = 27;
          break;
        }
        case 'no-tty': {
          enum8 = 28;
          break;
        }
        case 'no-such-device': {
          enum8 = 29;
          break;
        }
        case 'overflow': {
          enum8 = 30;
          break;
        }
        case 'not-permitted': {
          enum8 = 31;
          break;
        }
        case 'pipe': {
          enum8 = 32;
          break;
        }
        case 'read-only': {
          enum8 = 33;
          break;
        }
        case 'invalid-seek': {
          enum8 = 34;
          break;
        }
        case 'text-file-busy': {
          enum8 = 35;
          break;
        }
        case 'cross-device': {
          enum8 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val8}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg6 + 4, enum8, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.open-at"][Instruction::Return]', {
    funcName: '[method]descriptor.open-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline20(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable16[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]descriptor.read');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.read(BigInt.asUintN(64, arg1), BigInt.asUintN(64, arg2))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory0).setInt8(arg3 + 0, 0, true);
      var [tuple3_0, tuple3_1] = e;
      var val4 = tuple3_0;
      var len4 = val4.byteLength;
      var ptr4 = realloc0(0, 0, 1, len4 * 1);
      var src4 = new Uint8Array(val4.buffer || val4, val4.byteOffset, len4 * 1);
      (new Uint8Array(memory0.buffer, ptr4, len4 * 1)).set(src4);
      dataView(memory0).setUint32(arg3 + 8, len4, true);
      dataView(memory0).setUint32(arg3 + 4, ptr4, true);
      dataView(memory0).setInt8(arg3 + 12, tuple3_1 ? 1 : 0, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory0).setInt8(arg3 + 0, 1, true);
      var val5 = e;
      let enum5;
      switch (val5) {
        case 'access': {
          enum5 = 0;
          break;
        }
        case 'would-block': {
          enum5 = 1;
          break;
        }
        case 'already': {
          enum5 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum5 = 3;
          break;
        }
        case 'busy': {
          enum5 = 4;
          break;
        }
        case 'deadlock': {
          enum5 = 5;
          break;
        }
        case 'quota': {
          enum5 = 6;
          break;
        }
        case 'exist': {
          enum5 = 7;
          break;
        }
        case 'file-too-large': {
          enum5 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum5 = 9;
          break;
        }
        case 'in-progress': {
          enum5 = 10;
          break;
        }
        case 'interrupted': {
          enum5 = 11;
          break;
        }
        case 'invalid': {
          enum5 = 12;
          break;
        }
        case 'io': {
          enum5 = 13;
          break;
        }
        case 'is-directory': {
          enum5 = 14;
          break;
        }
        case 'loop': {
          enum5 = 15;
          break;
        }
        case 'too-many-links': {
          enum5 = 16;
          break;
        }
        case 'message-size': {
          enum5 = 17;
          break;
        }
        case 'name-too-long': {
          enum5 = 18;
          break;
        }
        case 'no-device': {
          enum5 = 19;
          break;
        }
        case 'no-entry': {
          enum5 = 20;
          break;
        }
        case 'no-lock': {
          enum5 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum5 = 22;
          break;
        }
        case 'insufficient-space': {
          enum5 = 23;
          break;
        }
        case 'not-directory': {
          enum5 = 24;
          break;
        }
        case 'not-empty': {
          enum5 = 25;
          break;
        }
        case 'not-recoverable': {
          enum5 = 26;
          break;
        }
        case 'unsupported': {
          enum5 = 27;
          break;
        }
        case 'no-tty': {
          enum5 = 28;
          break;
        }
        case 'no-such-device': {
          enum5 = 29;
          break;
        }
        case 'overflow': {
          enum5 = 30;
          break;
        }
        case 'not-permitted': {
          enum5 = 31;
          break;
        }
        case 'pipe': {
          enum5 = 32;
          break;
        }
        case 'read-only': {
          enum5 = 33;
          break;
        }
        case 'invalid-seek': {
          enum5 = 34;
          break;
        }
        case 'text-file-busy': {
          enum5 = 35;
          break;
        }
        case 'cross-device': {
          enum5 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val5}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg3 + 4, enum5, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read"][Instruction::Return]', {
    funcName: '[method]descriptor.read',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}

const handleTable17 = [T_FLAG, 0];
const captureTable5= new Map();
let captureCnt5 = 0;
handleTables[17] = handleTable17;

function trampoline21(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable16[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read-directory"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]descriptor.read-directory');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.readDirectory()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read-directory"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory0).setInt8(arg1 + 0, 0, true);
      if (!(e instanceof DirectoryEntryStream)) {
        throw new TypeError('Resource error: Not a valid "DirectoryEntryStream" resource.');
      }
      var handle3 = e[symbolRscHandle];
      if (!handle3) {
        const rep = e[symbolRscRep] || ++captureCnt5;
        captureTable5.set(rep, e);
        handle3 = rscTableCreateOwn(handleTable17, rep);
      }
      dataView(memory0).setInt32(arg1 + 4, handle3, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory0).setInt8(arg1 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg1 + 4, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read-directory"][Instruction::Return]', {
    funcName: '[method]descriptor.read-directory',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline22(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable16[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.readlink-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]descriptor.readlink-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.readlinkAt(result3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.readlink-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory0).setInt8(arg3 + 0, 0, true);
      var ptr4 = utf8Encode(e, realloc0, memory0);
      var len4 = utf8EncodedLen;
      dataView(memory0).setUint32(arg3 + 8, len4, true);
      dataView(memory0).setUint32(arg3 + 4, ptr4, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory0).setInt8(arg3 + 0, 1, true);
      var val5 = e;
      let enum5;
      switch (val5) {
        case 'access': {
          enum5 = 0;
          break;
        }
        case 'would-block': {
          enum5 = 1;
          break;
        }
        case 'already': {
          enum5 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum5 = 3;
          break;
        }
        case 'busy': {
          enum5 = 4;
          break;
        }
        case 'deadlock': {
          enum5 = 5;
          break;
        }
        case 'quota': {
          enum5 = 6;
          break;
        }
        case 'exist': {
          enum5 = 7;
          break;
        }
        case 'file-too-large': {
          enum5 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum5 = 9;
          break;
        }
        case 'in-progress': {
          enum5 = 10;
          break;
        }
        case 'interrupted': {
          enum5 = 11;
          break;
        }
        case 'invalid': {
          enum5 = 12;
          break;
        }
        case 'io': {
          enum5 = 13;
          break;
        }
        case 'is-directory': {
          enum5 = 14;
          break;
        }
        case 'loop': {
          enum5 = 15;
          break;
        }
        case 'too-many-links': {
          enum5 = 16;
          break;
        }
        case 'message-size': {
          enum5 = 17;
          break;
        }
        case 'name-too-long': {
          enum5 = 18;
          break;
        }
        case 'no-device': {
          enum5 = 19;
          break;
        }
        case 'no-entry': {
          enum5 = 20;
          break;
        }
        case 'no-lock': {
          enum5 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum5 = 22;
          break;
        }
        case 'insufficient-space': {
          enum5 = 23;
          break;
        }
        case 'not-directory': {
          enum5 = 24;
          break;
        }
        case 'not-empty': {
          enum5 = 25;
          break;
        }
        case 'not-recoverable': {
          enum5 = 26;
          break;
        }
        case 'unsupported': {
          enum5 = 27;
          break;
        }
        case 'no-tty': {
          enum5 = 28;
          break;
        }
        case 'no-such-device': {
          enum5 = 29;
          break;
        }
        case 'overflow': {
          enum5 = 30;
          break;
        }
        case 'not-permitted': {
          enum5 = 31;
          break;
        }
        case 'pipe': {
          enum5 = 32;
          break;
        }
        case 'read-only': {
          enum5 = 33;
          break;
        }
        case 'invalid-seek': {
          enum5 = 34;
          break;
        }
        case 'text-file-busy': {
          enum5 = 35;
          break;
        }
        case 'cross-device': {
          enum5 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val5}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg3 + 4, enum5, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.readlink-at"][Instruction::Return]', {
    funcName: '[method]descriptor.readlink-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline23(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable16[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.remove-directory-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]descriptor.remove-directory-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.removeDirectoryAt(result3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.remove-directory-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory0).setInt8(arg3 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory0).setInt8(arg3 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg3 + 1, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.remove-directory-at"][Instruction::Return]', {
    funcName: '[method]descriptor.remove-directory-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline24(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
  var handle1 = arg0;
  var rep2 = handleTable16[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
  var handle5 = arg3;
  var rep6 = handleTable16[(handle5 << 1) + 1] & ~T_FLAG;
  var rsc4 = captureTable4.get(rep6);
  if (!rsc4) {
    rsc4 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc4, symbolRscHandle, { writable: true, value: handle5});
    Object.defineProperty(rsc4, symbolRscRep, { writable: true, value: rep6});
  }
  curResourceBorrows.push(rsc4);
  var ptr7 = arg4;
  var len7 = arg5;
  var result7 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr7, len7));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.rename-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]descriptor.rename-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.renameAt(result3, rsc4, result7)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.rename-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant9 = ret;
  switch (variant9.tag) {
    case 'ok': {
      const e = variant9.val;
      dataView(memory0).setInt8(arg6 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant9.val;
      dataView(memory0).setInt8(arg6 + 0, 1, true);
      var val8 = e;
      let enum8;
      switch (val8) {
        case 'access': {
          enum8 = 0;
          break;
        }
        case 'would-block': {
          enum8 = 1;
          break;
        }
        case 'already': {
          enum8 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum8 = 3;
          break;
        }
        case 'busy': {
          enum8 = 4;
          break;
        }
        case 'deadlock': {
          enum8 = 5;
          break;
        }
        case 'quota': {
          enum8 = 6;
          break;
        }
        case 'exist': {
          enum8 = 7;
          break;
        }
        case 'file-too-large': {
          enum8 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum8 = 9;
          break;
        }
        case 'in-progress': {
          enum8 = 10;
          break;
        }
        case 'interrupted': {
          enum8 = 11;
          break;
        }
        case 'invalid': {
          enum8 = 12;
          break;
        }
        case 'io': {
          enum8 = 13;
          break;
        }
        case 'is-directory': {
          enum8 = 14;
          break;
        }
        case 'loop': {
          enum8 = 15;
          break;
        }
        case 'too-many-links': {
          enum8 = 16;
          break;
        }
        case 'message-size': {
          enum8 = 17;
          break;
        }
        case 'name-too-long': {
          enum8 = 18;
          break;
        }
        case 'no-device': {
          enum8 = 19;
          break;
        }
        case 'no-entry': {
          enum8 = 20;
          break;
        }
        case 'no-lock': {
          enum8 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum8 = 22;
          break;
        }
        case 'insufficient-space': {
          enum8 = 23;
          break;
        }
        case 'not-directory': {
          enum8 = 24;
          break;
        }
        case 'not-empty': {
          enum8 = 25;
          break;
        }
        case 'not-recoverable': {
          enum8 = 26;
          break;
        }
        case 'unsupported': {
          enum8 = 27;
          break;
        }
        case 'no-tty': {
          enum8 = 28;
          break;
        }
        case 'no-such-device': {
          enum8 = 29;
          break;
        }
        case 'overflow': {
          enum8 = 30;
          break;
        }
        case 'not-permitted': {
          enum8 = 31;
          break;
        }
        case 'pipe': {
          enum8 = 32;
          break;
        }
        case 'read-only': {
          enum8 = 33;
          break;
        }
        case 'invalid-seek': {
          enum8 = 34;
          break;
        }
        case 'text-file-busy': {
          enum8 = 35;
          break;
        }
        case 'cross-device': {
          enum8 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val8}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg6 + 1, enum8, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.rename-at"][Instruction::Return]', {
    funcName: '[method]descriptor.rename-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline25(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable16[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.stat"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]descriptor.stat');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.stat()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.stat"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant12 = ret;
  switch (variant12.tag) {
    case 'ok': {
      const e = variant12.val;
      dataView(memory0).setInt8(arg1 + 0, 0, true);
      var {type: v3_0, linkCount: v3_1, size: v3_2, dataAccessTimestamp: v3_3, dataModificationTimestamp: v3_4, statusChangeTimestamp: v3_5 } = e;
      var val4 = v3_0;
      let enum4;
      switch (val4) {
        case 'unknown': {
          enum4 = 0;
          break;
        }
        case 'block-device': {
          enum4 = 1;
          break;
        }
        case 'character-device': {
          enum4 = 2;
          break;
        }
        case 'directory': {
          enum4 = 3;
          break;
        }
        case 'fifo': {
          enum4 = 4;
          break;
        }
        case 'symbolic-link': {
          enum4 = 5;
          break;
        }
        case 'regular-file': {
          enum4 = 6;
          break;
        }
        case 'socket': {
          enum4 = 7;
          break;
        }
        default: {
          if ((v3_0) instanceof Error) {
            console.error(v3_0);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of descriptor-type`);
        }
      }
      dataView(memory0).setInt8(arg1 + 8, enum4, true);
      dataView(memory0).setBigInt64(arg1 + 16, toUint64(v3_1), true);
      dataView(memory0).setBigInt64(arg1 + 24, toUint64(v3_2), true);
      var variant6 = v3_3;
      if (variant6 === null || variant6=== undefined) {
        dataView(memory0).setInt8(arg1 + 32, 0, true);
      } else {
        const e = variant6;
        dataView(memory0).setInt8(arg1 + 32, 1, true);
        var {seconds: v5_0, nanoseconds: v5_1 } = e;
        dataView(memory0).setBigInt64(arg1 + 40, toUint64(v5_0), true);
        dataView(memory0).setInt32(arg1 + 48, toUint32(v5_1), true);
      }
      var variant8 = v3_4;
      if (variant8 === null || variant8=== undefined) {
        dataView(memory0).setInt8(arg1 + 56, 0, true);
      } else {
        const e = variant8;
        dataView(memory0).setInt8(arg1 + 56, 1, true);
        var {seconds: v7_0, nanoseconds: v7_1 } = e;
        dataView(memory0).setBigInt64(arg1 + 64, toUint64(v7_0), true);
        dataView(memory0).setInt32(arg1 + 72, toUint32(v7_1), true);
      }
      var variant10 = v3_5;
      if (variant10 === null || variant10=== undefined) {
        dataView(memory0).setInt8(arg1 + 80, 0, true);
      } else {
        const e = variant10;
        dataView(memory0).setInt8(arg1 + 80, 1, true);
        var {seconds: v9_0, nanoseconds: v9_1 } = e;
        dataView(memory0).setBigInt64(arg1 + 88, toUint64(v9_0), true);
        dataView(memory0).setInt32(arg1 + 96, toUint32(v9_1), true);
      }
      break;
    }
    case 'err': {
      const e = variant12.val;
      dataView(memory0).setInt8(arg1 + 0, 1, true);
      var val11 = e;
      let enum11;
      switch (val11) {
        case 'access': {
          enum11 = 0;
          break;
        }
        case 'would-block': {
          enum11 = 1;
          break;
        }
        case 'already': {
          enum11 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum11 = 3;
          break;
        }
        case 'busy': {
          enum11 = 4;
          break;
        }
        case 'deadlock': {
          enum11 = 5;
          break;
        }
        case 'quota': {
          enum11 = 6;
          break;
        }
        case 'exist': {
          enum11 = 7;
          break;
        }
        case 'file-too-large': {
          enum11 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum11 = 9;
          break;
        }
        case 'in-progress': {
          enum11 = 10;
          break;
        }
        case 'interrupted': {
          enum11 = 11;
          break;
        }
        case 'invalid': {
          enum11 = 12;
          break;
        }
        case 'io': {
          enum11 = 13;
          break;
        }
        case 'is-directory': {
          enum11 = 14;
          break;
        }
        case 'loop': {
          enum11 = 15;
          break;
        }
        case 'too-many-links': {
          enum11 = 16;
          break;
        }
        case 'message-size': {
          enum11 = 17;
          break;
        }
        case 'name-too-long': {
          enum11 = 18;
          break;
        }
        case 'no-device': {
          enum11 = 19;
          break;
        }
        case 'no-entry': {
          enum11 = 20;
          break;
        }
        case 'no-lock': {
          enum11 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum11 = 22;
          break;
        }
        case 'insufficient-space': {
          enum11 = 23;
          break;
        }
        case 'not-directory': {
          enum11 = 24;
          break;
        }
        case 'not-empty': {
          enum11 = 25;
          break;
        }
        case 'not-recoverable': {
          enum11 = 26;
          break;
        }
        case 'unsupported': {
          enum11 = 27;
          break;
        }
        case 'no-tty': {
          enum11 = 28;
          break;
        }
        case 'no-such-device': {
          enum11 = 29;
          break;
        }
        case 'overflow': {
          enum11 = 30;
          break;
        }
        case 'not-permitted': {
          enum11 = 31;
          break;
        }
        case 'pipe': {
          enum11 = 32;
          break;
        }
        case 'read-only': {
          enum11 = 33;
          break;
        }
        case 'invalid-seek': {
          enum11 = 34;
          break;
        }
        case 'text-file-busy': {
          enum11 = 35;
          break;
        }
        case 'cross-device': {
          enum11 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val11}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg1 + 8, enum11, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.stat"][Instruction::Return]', {
    funcName: '[method]descriptor.stat',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline26(arg0, arg1, arg2, arg3, arg4) {
  var handle1 = arg0;
  var rep2 = handleTable16[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  if ((arg1 & 4294967294) !== 0) {
    throw new TypeError('flags have extraneous bits set');
  }
  var flags3 = {
    symlinkFollow: Boolean(arg1 & 1),
  };
  var ptr4 = arg2;
  var len4 = arg3;
  var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.stat-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]descriptor.stat-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.statAt(flags3, result4)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.stat-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant14 = ret;
  switch (variant14.tag) {
    case 'ok': {
      const e = variant14.val;
      dataView(memory0).setInt8(arg4 + 0, 0, true);
      var {type: v5_0, linkCount: v5_1, size: v5_2, dataAccessTimestamp: v5_3, dataModificationTimestamp: v5_4, statusChangeTimestamp: v5_5 } = e;
      var val6 = v5_0;
      let enum6;
      switch (val6) {
        case 'unknown': {
          enum6 = 0;
          break;
        }
        case 'block-device': {
          enum6 = 1;
          break;
        }
        case 'character-device': {
          enum6 = 2;
          break;
        }
        case 'directory': {
          enum6 = 3;
          break;
        }
        case 'fifo': {
          enum6 = 4;
          break;
        }
        case 'symbolic-link': {
          enum6 = 5;
          break;
        }
        case 'regular-file': {
          enum6 = 6;
          break;
        }
        case 'socket': {
          enum6 = 7;
          break;
        }
        default: {
          if ((v5_0) instanceof Error) {
            console.error(v5_0);
          }
          
          throw new TypeError(`"${val6}" is not one of the cases of descriptor-type`);
        }
      }
      dataView(memory0).setInt8(arg4 + 8, enum6, true);
      dataView(memory0).setBigInt64(arg4 + 16, toUint64(v5_1), true);
      dataView(memory0).setBigInt64(arg4 + 24, toUint64(v5_2), true);
      var variant8 = v5_3;
      if (variant8 === null || variant8=== undefined) {
        dataView(memory0).setInt8(arg4 + 32, 0, true);
      } else {
        const e = variant8;
        dataView(memory0).setInt8(arg4 + 32, 1, true);
        var {seconds: v7_0, nanoseconds: v7_1 } = e;
        dataView(memory0).setBigInt64(arg4 + 40, toUint64(v7_0), true);
        dataView(memory0).setInt32(arg4 + 48, toUint32(v7_1), true);
      }
      var variant10 = v5_4;
      if (variant10 === null || variant10=== undefined) {
        dataView(memory0).setInt8(arg4 + 56, 0, true);
      } else {
        const e = variant10;
        dataView(memory0).setInt8(arg4 + 56, 1, true);
        var {seconds: v9_0, nanoseconds: v9_1 } = e;
        dataView(memory0).setBigInt64(arg4 + 64, toUint64(v9_0), true);
        dataView(memory0).setInt32(arg4 + 72, toUint32(v9_1), true);
      }
      var variant12 = v5_5;
      if (variant12 === null || variant12=== undefined) {
        dataView(memory0).setInt8(arg4 + 80, 0, true);
      } else {
        const e = variant12;
        dataView(memory0).setInt8(arg4 + 80, 1, true);
        var {seconds: v11_0, nanoseconds: v11_1 } = e;
        dataView(memory0).setBigInt64(arg4 + 88, toUint64(v11_0), true);
        dataView(memory0).setInt32(arg4 + 96, toUint32(v11_1), true);
      }
      break;
    }
    case 'err': {
      const e = variant14.val;
      dataView(memory0).setInt8(arg4 + 0, 1, true);
      var val13 = e;
      let enum13;
      switch (val13) {
        case 'access': {
          enum13 = 0;
          break;
        }
        case 'would-block': {
          enum13 = 1;
          break;
        }
        case 'already': {
          enum13 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum13 = 3;
          break;
        }
        case 'busy': {
          enum13 = 4;
          break;
        }
        case 'deadlock': {
          enum13 = 5;
          break;
        }
        case 'quota': {
          enum13 = 6;
          break;
        }
        case 'exist': {
          enum13 = 7;
          break;
        }
        case 'file-too-large': {
          enum13 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum13 = 9;
          break;
        }
        case 'in-progress': {
          enum13 = 10;
          break;
        }
        case 'interrupted': {
          enum13 = 11;
          break;
        }
        case 'invalid': {
          enum13 = 12;
          break;
        }
        case 'io': {
          enum13 = 13;
          break;
        }
        case 'is-directory': {
          enum13 = 14;
          break;
        }
        case 'loop': {
          enum13 = 15;
          break;
        }
        case 'too-many-links': {
          enum13 = 16;
          break;
        }
        case 'message-size': {
          enum13 = 17;
          break;
        }
        case 'name-too-long': {
          enum13 = 18;
          break;
        }
        case 'no-device': {
          enum13 = 19;
          break;
        }
        case 'no-entry': {
          enum13 = 20;
          break;
        }
        case 'no-lock': {
          enum13 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum13 = 22;
          break;
        }
        case 'insufficient-space': {
          enum13 = 23;
          break;
        }
        case 'not-directory': {
          enum13 = 24;
          break;
        }
        case 'not-empty': {
          enum13 = 25;
          break;
        }
        case 'not-recoverable': {
          enum13 = 26;
          break;
        }
        case 'unsupported': {
          enum13 = 27;
          break;
        }
        case 'no-tty': {
          enum13 = 28;
          break;
        }
        case 'no-such-device': {
          enum13 = 29;
          break;
        }
        case 'overflow': {
          enum13 = 30;
          break;
        }
        case 'not-permitted': {
          enum13 = 31;
          break;
        }
        case 'pipe': {
          enum13 = 32;
          break;
        }
        case 'read-only': {
          enum13 = 33;
          break;
        }
        case 'invalid-seek': {
          enum13 = 34;
          break;
        }
        case 'text-file-busy': {
          enum13 = 35;
          break;
        }
        case 'cross-device': {
          enum13 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val13}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg4 + 8, enum13, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.stat-at"][Instruction::Return]', {
    funcName: '[method]descriptor.stat-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline27(arg0, arg1, arg2, arg3, arg4, arg5) {
  var handle1 = arg0;
  var rep2 = handleTable16[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
  var ptr4 = arg3;
  var len4 = arg4;
  var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.symlink-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]descriptor.symlink-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.symlinkAt(result3, result4)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.symlink-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory0).setInt8(arg5 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory0).setInt8(arg5 + 0, 1, true);
      var val5 = e;
      let enum5;
      switch (val5) {
        case 'access': {
          enum5 = 0;
          break;
        }
        case 'would-block': {
          enum5 = 1;
          break;
        }
        case 'already': {
          enum5 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum5 = 3;
          break;
        }
        case 'busy': {
          enum5 = 4;
          break;
        }
        case 'deadlock': {
          enum5 = 5;
          break;
        }
        case 'quota': {
          enum5 = 6;
          break;
        }
        case 'exist': {
          enum5 = 7;
          break;
        }
        case 'file-too-large': {
          enum5 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum5 = 9;
          break;
        }
        case 'in-progress': {
          enum5 = 10;
          break;
        }
        case 'interrupted': {
          enum5 = 11;
          break;
        }
        case 'invalid': {
          enum5 = 12;
          break;
        }
        case 'io': {
          enum5 = 13;
          break;
        }
        case 'is-directory': {
          enum5 = 14;
          break;
        }
        case 'loop': {
          enum5 = 15;
          break;
        }
        case 'too-many-links': {
          enum5 = 16;
          break;
        }
        case 'message-size': {
          enum5 = 17;
          break;
        }
        case 'name-too-long': {
          enum5 = 18;
          break;
        }
        case 'no-device': {
          enum5 = 19;
          break;
        }
        case 'no-entry': {
          enum5 = 20;
          break;
        }
        case 'no-lock': {
          enum5 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum5 = 22;
          break;
        }
        case 'insufficient-space': {
          enum5 = 23;
          break;
        }
        case 'not-directory': {
          enum5 = 24;
          break;
        }
        case 'not-empty': {
          enum5 = 25;
          break;
        }
        case 'not-recoverable': {
          enum5 = 26;
          break;
        }
        case 'unsupported': {
          enum5 = 27;
          break;
        }
        case 'no-tty': {
          enum5 = 28;
          break;
        }
        case 'no-such-device': {
          enum5 = 29;
          break;
        }
        case 'overflow': {
          enum5 = 30;
          break;
        }
        case 'not-permitted': {
          enum5 = 31;
          break;
        }
        case 'pipe': {
          enum5 = 32;
          break;
        }
        case 'read-only': {
          enum5 = 33;
          break;
        }
        case 'invalid-seek': {
          enum5 = 34;
          break;
        }
        case 'text-file-busy': {
          enum5 = 35;
          break;
        }
        case 'cross-device': {
          enum5 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val5}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg5 + 1, enum5, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.symlink-at"][Instruction::Return]', {
    funcName: '[method]descriptor.symlink-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline28(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable16[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.sync-data"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]descriptor.sync-data');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.syncData()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.sync-data"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory0).setInt8(arg1 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory0).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'access': {
          enum3 = 0;
          break;
        }
        case 'would-block': {
          enum3 = 1;
          break;
        }
        case 'already': {
          enum3 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum3 = 3;
          break;
        }
        case 'busy': {
          enum3 = 4;
          break;
        }
        case 'deadlock': {
          enum3 = 5;
          break;
        }
        case 'quota': {
          enum3 = 6;
          break;
        }
        case 'exist': {
          enum3 = 7;
          break;
        }
        case 'file-too-large': {
          enum3 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum3 = 9;
          break;
        }
        case 'in-progress': {
          enum3 = 10;
          break;
        }
        case 'interrupted': {
          enum3 = 11;
          break;
        }
        case 'invalid': {
          enum3 = 12;
          break;
        }
        case 'io': {
          enum3 = 13;
          break;
        }
        case 'is-directory': {
          enum3 = 14;
          break;
        }
        case 'loop': {
          enum3 = 15;
          break;
        }
        case 'too-many-links': {
          enum3 = 16;
          break;
        }
        case 'message-size': {
          enum3 = 17;
          break;
        }
        case 'name-too-long': {
          enum3 = 18;
          break;
        }
        case 'no-device': {
          enum3 = 19;
          break;
        }
        case 'no-entry': {
          enum3 = 20;
          break;
        }
        case 'no-lock': {
          enum3 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum3 = 22;
          break;
        }
        case 'insufficient-space': {
          enum3 = 23;
          break;
        }
        case 'not-directory': {
          enum3 = 24;
          break;
        }
        case 'not-empty': {
          enum3 = 25;
          break;
        }
        case 'not-recoverable': {
          enum3 = 26;
          break;
        }
        case 'unsupported': {
          enum3 = 27;
          break;
        }
        case 'no-tty': {
          enum3 = 28;
          break;
        }
        case 'no-such-device': {
          enum3 = 29;
          break;
        }
        case 'overflow': {
          enum3 = 30;
          break;
        }
        case 'not-permitted': {
          enum3 = 31;
          break;
        }
        case 'pipe': {
          enum3 = 32;
          break;
        }
        case 'read-only': {
          enum3 = 33;
          break;
        }
        case 'invalid-seek': {
          enum3 = 34;
          break;
        }
        case 'text-file-busy': {
          enum3 = 35;
          break;
        }
        case 'cross-device': {
          enum3 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg1 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.sync-data"][Instruction::Return]', {
    funcName: '[method]descriptor.sync-data',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline29(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable16[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.unlink-file-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]descriptor.unlink-file-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.unlinkFileAt(result3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.unlink-file-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory0).setInt8(arg3 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory0).setInt8(arg3 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg3 + 1, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.unlink-file-at"][Instruction::Return]', {
    funcName: '[method]descriptor.unlink-file-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline30(arg0, arg1, arg2, arg3, arg4) {
  var handle1 = arg0;
  var rep2 = handleTable16[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = new Uint8Array(memory0.buffer.slice(ptr3, ptr3 + len3 * 1));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.write"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]descriptor.write');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.write(result3, BigInt.asUintN(64, arg3))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.write"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory0).setInt8(arg4 + 0, 0, true);
      dataView(memory0).setBigInt64(arg4 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory0).setInt8(arg4 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg4 + 8, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.write"][Instruction::Return]', {
    funcName: '[method]descriptor.write',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline31(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable17[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable5.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(DirectoryEntryStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]directory-entry-stream.read-directory-entry"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, '[method]directory-entry-stream.read-directory-entry');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.readDirectoryEntry()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]directory-entry-stream.read-directory-entry"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(1);
  var variant8 = ret;
  switch (variant8.tag) {
    case 'ok': {
      const e = variant8.val;
      dataView(memory0).setInt8(arg1 + 0, 0, true);
      var variant6 = e;
      if (variant6 === null || variant6=== undefined) {
        dataView(memory0).setInt8(arg1 + 4, 0, true);
      } else {
        const e = variant6;
        dataView(memory0).setInt8(arg1 + 4, 1, true);
        var {type: v3_0, name: v3_1 } = e;
        var val4 = v3_0;
        let enum4;
        switch (val4) {
          case 'unknown': {
            enum4 = 0;
            break;
          }
          case 'block-device': {
            enum4 = 1;
            break;
          }
          case 'character-device': {
            enum4 = 2;
            break;
          }
          case 'directory': {
            enum4 = 3;
            break;
          }
          case 'fifo': {
            enum4 = 4;
            break;
          }
          case 'symbolic-link': {
            enum4 = 5;
            break;
          }
          case 'regular-file': {
            enum4 = 6;
            break;
          }
          case 'socket': {
            enum4 = 7;
            break;
          }
          default: {
            if ((v3_0) instanceof Error) {
              console.error(v3_0);
            }
            
            throw new TypeError(`"${val4}" is not one of the cases of descriptor-type`);
          }
        }
        dataView(memory0).setInt8(arg1 + 8, enum4, true);
        var ptr5 = utf8Encode(v3_1, realloc0, memory0);
        var len5 = utf8EncodedLen;
        dataView(memory0).setUint32(arg1 + 16, len5, true);
        dataView(memory0).setUint32(arg1 + 12, ptr5, true);
      }
      break;
    }
    case 'err': {
      const e = variant8.val;
      dataView(memory0).setInt8(arg1 + 0, 1, true);
      var val7 = e;
      let enum7;
      switch (val7) {
        case 'access': {
          enum7 = 0;
          break;
        }
        case 'would-block': {
          enum7 = 1;
          break;
        }
        case 'already': {
          enum7 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum7 = 3;
          break;
        }
        case 'busy': {
          enum7 = 4;
          break;
        }
        case 'deadlock': {
          enum7 = 5;
          break;
        }
        case 'quota': {
          enum7 = 6;
          break;
        }
        case 'exist': {
          enum7 = 7;
          break;
        }
        case 'file-too-large': {
          enum7 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum7 = 9;
          break;
        }
        case 'in-progress': {
          enum7 = 10;
          break;
        }
        case 'interrupted': {
          enum7 = 11;
          break;
        }
        case 'invalid': {
          enum7 = 12;
          break;
        }
        case 'io': {
          enum7 = 13;
          break;
        }
        case 'is-directory': {
          enum7 = 14;
          break;
        }
        case 'loop': {
          enum7 = 15;
          break;
        }
        case 'too-many-links': {
          enum7 = 16;
          break;
        }
        case 'message-size': {
          enum7 = 17;
          break;
        }
        case 'name-too-long': {
          enum7 = 18;
          break;
        }
        case 'no-device': {
          enum7 = 19;
          break;
        }
        case 'no-entry': {
          enum7 = 20;
          break;
        }
        case 'no-lock': {
          enum7 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum7 = 22;
          break;
        }
        case 'insufficient-space': {
          enum7 = 23;
          break;
        }
        case 'not-directory': {
          enum7 = 24;
          break;
        }
        case 'not-empty': {
          enum7 = 25;
          break;
        }
        case 'not-recoverable': {
          enum7 = 26;
          break;
        }
        case 'unsupported': {
          enum7 = 27;
          break;
        }
        case 'no-tty': {
          enum7 = 28;
          break;
        }
        case 'no-such-device': {
          enum7 = 29;
          break;
        }
        case 'overflow': {
          enum7 = 30;
          break;
        }
        case 'not-permitted': {
          enum7 = 31;
          break;
        }
        case 'pipe': {
          enum7 = 32;
          break;
        }
        case 'read-only': {
          enum7 = 33;
          break;
        }
        case 'invalid-seek': {
          enum7 = 34;
          break;
        }
        case 'text-file-busy': {
          enum7 = 35;
          break;
        }
        case 'cross-device': {
          enum7 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val7}" is not one of the cases of error-code`);
        }
      }
      dataView(memory0).setInt8(arg1 + 4, enum7, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]directory-entry-stream.read-directory-entry"][Instruction::Return]', {
    funcName: '[method]directory-entry-stream.read-directory-entry',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline32(arg0) {
  _debugLog('[iface="wasi:filesystem/preopens@0.2.0", function="get-directories"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(1, false, 'get-directories');
  const ret = getDirectories();
  _debugLog('[iface="wasi:filesystem/preopens@0.2.0", function="get-directories"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(1);
  var vec3 = ret;
  var len3 = vec3.length;
  var result3 = realloc0(0, 0, 4, len3 * 12);
  for (let i = 0; i < vec3.length; i++) {
    const e = vec3[i];
    const base = result3 + i * 12;var [tuple0_0, tuple0_1] = e;
    if (!(tuple0_0 instanceof Descriptor)) {
      throw new TypeError('Resource error: Not a valid "Descriptor" resource.');
    }
    var handle1 = tuple0_0[symbolRscHandle];
    if (!handle1) {
      const rep = tuple0_0[symbolRscRep] || ++captureCnt4;
      captureTable4.set(rep, tuple0_0);
      handle1 = rscTableCreateOwn(handleTable16, rep);
    }
    dataView(memory0).setInt32(base + 0, handle1, true);
    var ptr2 = utf8Encode(tuple0_1, realloc0, memory0);
    var len2 = utf8EncodedLen;
    dataView(memory0).setUint32(base + 8, len2, true);
    dataView(memory0).setUint32(base + 4, ptr2, true);
  }
  dataView(memory0).setUint32(arg0 + 4, len3, true);
  dataView(memory0).setUint32(arg0 + 0, result3, true);
  _debugLog('[iface="wasi:filesystem/preopens@0.2.0", function="get-directories"][Instruction::Return]', {
    funcName: 'get-directories',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}

let exports2;
let exports3;
let exports4;
let exports5;

function trampoline33() {
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="resolution"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'resolution');
  const ret = resolution();
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="resolution"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="resolution"][Instruction::Return]', {
    funcName: 'resolution',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return toUint64(ret);
}


function trampoline34() {
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="now"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'now');
  const ret = now();
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="now"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="now"][Instruction::Return]', {
    funcName: 'now',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return toUint64(ret);
}

const handleTable19 = [T_FLAG, 0];
const captureTable1= new Map();
let captureCnt1 = 0;
handleTables[19] = handleTable19;

function trampoline40(arg0) {
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="subscribe-duration"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'subscribe-duration');
  const ret = subscribeDuration(BigInt.asUintN(64, arg0));
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="subscribe-duration"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  if (!(ret instanceof Pollable)) {
    throw new TypeError('Resource error: Not a valid "Pollable" resource.');
  }
  var handle0 = ret[symbolRscHandle];
  if (!handle0) {
    const rep = ret[symbolRscRep] || ++captureCnt1;
    captureTable1.set(rep, ret);
    handle0 = rscTableCreateOwn(handleTable19, rep);
  }
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="subscribe-duration"][Instruction::Return]', {
    funcName: 'subscribe-duration',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle0;
}


function trampoline41(arg0) {
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="subscribe-instant"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'subscribe-instant');
  const ret = subscribeInstant(BigInt.asUintN(64, arg0));
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="subscribe-instant"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  if (!(ret instanceof Pollable)) {
    throw new TypeError('Resource error: Not a valid "Pollable" resource.');
  }
  var handle0 = ret[symbolRscHandle];
  if (!handle0) {
    const rep = ret[symbolRscRep] || ++captureCnt1;
    captureTable1.set(rep, ret);
    handle0 = rscTableCreateOwn(handleTable19, rep);
  }
  _debugLog('[iface="wasi:clocks/monotonic-clock@0.2.0", function="subscribe-instant"][Instruction::Return]', {
    funcName: 'subscribe-instant',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle0;
}

const handleTable24 = [T_FLAG, 0];
handleTables[24] = handleTable24;

function trampoline42(arg0) {
  var handle1 = arg0;
  var rep2 = handleTable24[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable3.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.subscribe"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]output-stream.subscribe');
  const ret = rsc0.subscribe();
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.subscribe"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  if (!(ret instanceof Pollable)) {
    throw new TypeError('Resource error: Not a valid "Pollable" resource.');
  }
  var handle3 = ret[symbolRscHandle];
  if (!handle3) {
    const rep = ret[symbolRscRep] || ++captureCnt1;
    captureTable1.set(rep, ret);
    handle3 = rscTableCreateOwn(handleTable19, rep);
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.subscribe"][Instruction::Return]', {
    funcName: '[method]output-stream.subscribe',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle3;
}

const handleTable23 = [T_FLAG, 0];
handleTables[23] = handleTable23;

function trampoline43(arg0) {
  var handle1 = arg0;
  var rep2 = handleTable23[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable2.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(InputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.subscribe"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]input-stream.subscribe');
  const ret = rsc0.subscribe();
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.subscribe"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  if (!(ret instanceof Pollable)) {
    throw new TypeError('Resource error: Not a valid "Pollable" resource.');
  }
  var handle3 = ret[symbolRscHandle];
  if (!handle3) {
    const rep = ret[symbolRscRep] || ++captureCnt1;
    captureTable1.set(rep, ret);
    handle3 = rscTableCreateOwn(handleTable19, rep);
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.subscribe"][Instruction::Return]', {
    funcName: '[method]input-stream.subscribe',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle3;
}


function trampoline47() {
  _debugLog('[iface="wasi:cli/stderr@0.2.0", function="get-stderr"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-stderr');
  const ret = getStderr();
  _debugLog('[iface="wasi:cli/stderr@0.2.0", function="get-stderr"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  if (!(ret instanceof OutputStream)) {
    throw new TypeError('Resource error: Not a valid "OutputStream" resource.');
  }
  var handle0 = ret[symbolRscHandle];
  if (!handle0) {
    const rep = ret[symbolRscRep] || ++captureCnt3;
    captureTable3.set(rep, ret);
    handle0 = rscTableCreateOwn(handleTable24, rep);
  }
  _debugLog('[iface="wasi:cli/stderr@0.2.0", function="get-stderr"][Instruction::Return]', {
    funcName: 'get-stderr',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle0;
}


function trampoline48(arg0) {
  let variant0;
  switch (arg0) {
    case 0: {
      variant0= {
        tag: 'ok',
        val: undefined
      };
      break;
    }
    case 1: {
      variant0= {
        tag: 'err',
        val: undefined
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  _debugLog('[iface="wasi:cli/exit@0.2.0", function="exit"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'exit');
  exit(variant0);
  _debugLog('[iface="wasi:cli/exit@0.2.0", function="exit"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  _debugLog('[iface="wasi:cli/exit@0.2.0", function="exit"][Instruction::Return]', {
    funcName: 'exit',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline49() {
  _debugLog('[iface="wasi:cli/stdin@0.2.0", function="get-stdin"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-stdin');
  const ret = getStdin();
  _debugLog('[iface="wasi:cli/stdin@0.2.0", function="get-stdin"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  if (!(ret instanceof InputStream)) {
    throw new TypeError('Resource error: Not a valid "InputStream" resource.');
  }
  var handle0 = ret[symbolRscHandle];
  if (!handle0) {
    const rep = ret[symbolRscRep] || ++captureCnt2;
    captureTable2.set(rep, ret);
    handle0 = rscTableCreateOwn(handleTable23, rep);
  }
  _debugLog('[iface="wasi:cli/stdin@0.2.0", function="get-stdin"][Instruction::Return]', {
    funcName: 'get-stdin',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle0;
}


function trampoline50() {
  _debugLog('[iface="wasi:cli/stdout@0.2.0", function="get-stdout"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-stdout');
  const ret = getStdout();
  _debugLog('[iface="wasi:cli/stdout@0.2.0", function="get-stdout"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  if (!(ret instanceof OutputStream)) {
    throw new TypeError('Resource error: Not a valid "OutputStream" resource.');
  }
  var handle0 = ret[symbolRscHandle];
  if (!handle0) {
    const rep = ret[symbolRscRep] || ++captureCnt3;
    captureTable3.set(rep, ret);
    handle0 = rscTableCreateOwn(handleTable24, rep);
  }
  _debugLog('[iface="wasi:cli/stdout@0.2.0", function="get-stdout"][Instruction::Return]', {
    funcName: 'get-stdout',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle0;
}

let exports6;
let exports7;
let exports8;
let exports9;
let exports10;

function trampoline57(arg0) {
  var handle1 = arg0;
  var rep2 = handleTable19[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable1.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Pollable.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/poll@0.2.0", function="[method]pollable.ready"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]pollable.ready');
  const ret = rsc0.ready();
  _debugLog('[iface="wasi:io/poll@0.2.0", function="[method]pollable.ready"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  _debugLog('[iface="wasi:io/poll@0.2.0", function="[method]pollable.ready"][Instruction::Return]', {
    funcName: '[method]pollable.ready',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return ret ? 1 : 0;
}


function trampoline58(arg0) {
  var handle1 = arg0;
  var rep2 = handleTable19[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable1.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Pollable.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/poll@0.2.0", function="[method]pollable.block"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]pollable.block');
  rsc0.block();
  _debugLog('[iface="wasi:io/poll@0.2.0", function="[method]pollable.block"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  _debugLog('[iface="wasi:io/poll@0.2.0", function="[method]pollable.block"][Instruction::Return]', {
    funcName: '[method]pollable.block',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}

const handleTable21 = [T_FLAG, 0];
handleTables[21] = handleTable21;

function trampoline59(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var handle4 = arg1;
  var rep5 = handleTable21[(handle4 << 1) + 1] & ~T_FLAG;
  var rsc3 = captureTable4.get(rep5);
  if (!rsc3) {
    rsc3 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc3, symbolRscHandle, { writable: true, value: handle4});
    Object.defineProperty(rsc3, symbolRscRep, { writable: true, value: rep5});
  }
  curResourceBorrows.push(rsc3);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.is-same-object"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.is-same-object');
  const ret = rsc0.isSameObject(rsc3);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.is-same-object"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.is-same-object"][Instruction::Return]', {
    funcName: '[method]descriptor.is-same-object',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return ret ? 1 : 0;
}

const handleTable27 = [T_FLAG, 0];
const captureTable8= new Map();
let captureCnt8 = 0;
handleTables[27] = handleTable27;

function trampoline60() {
  _debugLog('[iface="wasi:sockets/instance-network@0.2.0", function="instance-network"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'instance-network');
  const ret = instanceNetwork();
  _debugLog('[iface="wasi:sockets/instance-network@0.2.0", function="instance-network"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  if (!(ret instanceof Network)) {
    throw new TypeError('Resource error: Not a valid "Network" resource.');
  }
  var handle0 = ret[symbolRscHandle];
  if (!handle0) {
    const rep = ret[symbolRscRep] || ++captureCnt8;
    captureTable8.set(rep, ret);
    handle0 = rscTableCreateOwn(handleTable27, rep);
  }
  _debugLog('[iface="wasi:sockets/instance-network@0.2.0", function="instance-network"][Instruction::Return]', {
    funcName: 'instance-network',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle0;
}

const handleTable28 = [T_FLAG, 0];
const captureTable9= new Map();
let captureCnt9 = 0;
handleTables[28] = handleTable28;

function trampoline61(arg0) {
  var handle1 = arg0;
  var rep2 = handleTable28[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable9.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(UdpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.address-family"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]udp-socket.address-family');
  const ret = rsc0.addressFamily();
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.address-family"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var val3 = ret;
  let enum3;
  switch (val3) {
    case 'ipv4': {
      enum3 = 0;
      break;
    }
    case 'ipv6': {
      enum3 = 1;
      break;
    }
    default: {
      if ((ret) instanceof Error) {
        console.error(ret);
      }
      
      throw new TypeError(`"${val3}" is not one of the cases of ip-address-family`);
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.address-family"][Instruction::Return]', {
    funcName: '[method]udp-socket.address-family',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return enum3;
}


function trampoline62(arg0) {
  var handle1 = arg0;
  var rep2 = handleTable28[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable9.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(UdpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.subscribe"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]udp-socket.subscribe');
  const ret = rsc0.subscribe();
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.subscribe"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  if (!(ret instanceof Pollable)) {
    throw new TypeError('Resource error: Not a valid "Pollable" resource.');
  }
  var handle3 = ret[symbolRscHandle];
  if (!handle3) {
    const rep = ret[symbolRscRep] || ++captureCnt1;
    captureTable1.set(rep, ret);
    handle3 = rscTableCreateOwn(handleTable19, rep);
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.subscribe"][Instruction::Return]', {
    funcName: '[method]udp-socket.subscribe',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle3;
}

const handleTable29 = [T_FLAG, 0];
const captureTable10= new Map();
let captureCnt10 = 0;
handleTables[29] = handleTable29;

function trampoline63(arg0) {
  var handle1 = arg0;
  var rep2 = handleTable29[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable10.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(IncomingDatagramStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]incoming-datagram-stream.subscribe"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]incoming-datagram-stream.subscribe');
  const ret = rsc0.subscribe();
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]incoming-datagram-stream.subscribe"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  if (!(ret instanceof Pollable)) {
    throw new TypeError('Resource error: Not a valid "Pollable" resource.');
  }
  var handle3 = ret[symbolRscHandle];
  if (!handle3) {
    const rep = ret[symbolRscRep] || ++captureCnt1;
    captureTable1.set(rep, ret);
    handle3 = rscTableCreateOwn(handleTable19, rep);
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]incoming-datagram-stream.subscribe"][Instruction::Return]', {
    funcName: '[method]incoming-datagram-stream.subscribe',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle3;
}

const handleTable30 = [T_FLAG, 0];
const captureTable11= new Map();
let captureCnt11 = 0;
handleTables[30] = handleTable30;

function trampoline64(arg0) {
  var handle1 = arg0;
  var rep2 = handleTable30[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable11.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutgoingDatagramStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]outgoing-datagram-stream.subscribe"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]outgoing-datagram-stream.subscribe');
  const ret = rsc0.subscribe();
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]outgoing-datagram-stream.subscribe"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  if (!(ret instanceof Pollable)) {
    throw new TypeError('Resource error: Not a valid "Pollable" resource.');
  }
  var handle3 = ret[symbolRscHandle];
  if (!handle3) {
    const rep = ret[symbolRscRep] || ++captureCnt1;
    captureTable1.set(rep, ret);
    handle3 = rscTableCreateOwn(handleTable19, rep);
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]outgoing-datagram-stream.subscribe"][Instruction::Return]', {
    funcName: '[method]outgoing-datagram-stream.subscribe',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle3;
}

const handleTable31 = [T_FLAG, 0];
const captureTable12= new Map();
let captureCnt12 = 0;
handleTables[31] = handleTable31;

function trampoline65(arg0) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.is-listening"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.is-listening');
  const ret = rsc0.isListening();
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.is-listening"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.is-listening"][Instruction::Return]', {
    funcName: '[method]tcp-socket.is-listening',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return ret ? 1 : 0;
}


function trampoline66(arg0) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.address-family"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.address-family');
  const ret = rsc0.addressFamily();
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.address-family"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var val3 = ret;
  let enum3;
  switch (val3) {
    case 'ipv4': {
      enum3 = 0;
      break;
    }
    case 'ipv6': {
      enum3 = 1;
      break;
    }
    default: {
      if ((ret) instanceof Error) {
        console.error(ret);
      }
      
      throw new TypeError(`"${val3}" is not one of the cases of ip-address-family`);
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.address-family"][Instruction::Return]', {
    funcName: '[method]tcp-socket.address-family',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return enum3;
}


function trampoline67(arg0) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.subscribe"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.subscribe');
  const ret = rsc0.subscribe();
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.subscribe"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  if (!(ret instanceof Pollable)) {
    throw new TypeError('Resource error: Not a valid "Pollable" resource.');
  }
  var handle3 = ret[symbolRscHandle];
  if (!handle3) {
    const rep = ret[symbolRscRep] || ++captureCnt1;
    captureTable1.set(rep, ret);
    handle3 = rscTableCreateOwn(handleTable19, rep);
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.subscribe"][Instruction::Return]', {
    funcName: '[method]tcp-socket.subscribe',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle3;
}

const handleTable32 = [T_FLAG, 0];
const captureTable13= new Map();
let captureCnt13 = 0;
handleTables[32] = handleTable32;

function trampoline68(arg0) {
  var handle1 = arg0;
  var rep2 = handleTable32[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable13.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(ResolveAddressStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/ip-name-lookup@0.2.0", function="[method]resolve-address-stream.subscribe"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]resolve-address-stream.subscribe');
  const ret = rsc0.subscribe();
  _debugLog('[iface="wasi:sockets/ip-name-lookup@0.2.0", function="[method]resolve-address-stream.subscribe"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  if (!(ret instanceof Pollable)) {
    throw new TypeError('Resource error: Not a valid "Pollable" resource.');
  }
  var handle3 = ret[symbolRscHandle];
  if (!handle3) {
    const rep = ret[symbolRscRep] || ++captureCnt1;
    captureTable1.set(rep, ret);
    handle3 = rscTableCreateOwn(handleTable19, rep);
  }
  _debugLog('[iface="wasi:sockets/ip-name-lookup@0.2.0", function="[method]resolve-address-stream.subscribe"][Instruction::Return]', {
    funcName: '[method]resolve-address-stream.subscribe',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return handle3;
}


function trampoline69() {
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-u64"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-random-u64');
  const ret = getRandomU64();
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-u64"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-u64"][Instruction::Return]', {
    funcName: 'get-random-u64',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return toUint64(ret);
}


function trampoline70() {
  _debugLog('[iface="wasi:random/insecure@0.2.0", function="get-insecure-random-u64"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-insecure-random-u64');
  const ret = getInsecureRandomU64();
  _debugLog('[iface="wasi:random/insecure@0.2.0", function="get-insecure-random-u64"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  _debugLog('[iface="wasi:random/insecure@0.2.0", function="get-insecure-random-u64"][Instruction::Return]', {
    funcName: 'get-insecure-random-u64',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  return toUint64(ret);
}

let exports11;
let exports12;
let exports13;
let exports14;
let exports15;
let memory1;
let realloc1;
let realloc2;
let realloc3;

function trampoline71(arg0) {
  _debugLog('[iface="wasi:filesystem/preopens@0.2.0", function="get-directories"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-directories');
  const ret = getDirectories();
  _debugLog('[iface="wasi:filesystem/preopens@0.2.0", function="get-directories"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var vec3 = ret;
  var len3 = vec3.length;
  var result3 = realloc1(0, 0, 4, len3 * 12);
  for (let i = 0; i < vec3.length; i++) {
    const e = vec3[i];
    const base = result3 + i * 12;var [tuple0_0, tuple0_1] = e;
    if (!(tuple0_0 instanceof Descriptor)) {
      throw new TypeError('Resource error: Not a valid "Descriptor" resource.');
    }
    var handle1 = tuple0_0[symbolRscHandle];
    if (!handle1) {
      const rep = tuple0_0[symbolRscRep] || ++captureCnt4;
      captureTable4.set(rep, tuple0_0);
      handle1 = rscTableCreateOwn(handleTable21, rep);
    }
    dataView(memory1).setInt32(base + 0, handle1, true);
    var ptr2 = utf8Encode(tuple0_1, realloc1, memory1);
    var len2 = utf8EncodedLen;
    dataView(memory1).setUint32(base + 8, len2, true);
    dataView(memory1).setUint32(base + 4, ptr2, true);
  }
  dataView(memory1).setUint32(arg0 + 4, len3, true);
  dataView(memory1).setUint32(arg0 + 0, result3, true);
  _debugLog('[iface="wasi:filesystem/preopens@0.2.0", function="get-directories"][Instruction::Return]', {
    funcName: 'get-directories',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline72(arg0) {
  _debugLog('[iface="wasi:clocks/wall-clock@0.2.0", function="resolution"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'resolution');
  const ret = resolution$1();
  _debugLog('[iface="wasi:clocks/wall-clock@0.2.0", function="resolution"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var {seconds: v0_0, nanoseconds: v0_1 } = ret;
  dataView(memory1).setBigInt64(arg0 + 0, toUint64(v0_0), true);
  dataView(memory1).setInt32(arg0 + 8, toUint32(v0_1), true);
  _debugLog('[iface="wasi:clocks/wall-clock@0.2.0", function="resolution"][Instruction::Return]', {
    funcName: 'resolution',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline73(arg0) {
  _debugLog('[iface="wasi:clocks/wall-clock@0.2.0", function="now"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'now');
  const ret = now$1();
  _debugLog('[iface="wasi:clocks/wall-clock@0.2.0", function="now"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var {seconds: v0_0, nanoseconds: v0_1 } = ret;
  dataView(memory1).setBigInt64(arg0 + 0, toUint64(v0_0), true);
  dataView(memory1).setInt32(arg0 + 8, toUint32(v0_1), true);
  _debugLog('[iface="wasi:clocks/wall-clock@0.2.0", function="now"][Instruction::Return]', {
    funcName: 'now',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline74(arg0, arg1, arg2, arg3, arg4) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  let enum3;
  switch (arg3) {
    case 0: {
      enum3 = 'normal';
      break;
    }
    case 1: {
      enum3 = 'sequential';
      break;
    }
    case 2: {
      enum3 = 'random';
      break;
    }
    case 3: {
      enum3 = 'will-need';
      break;
    }
    case 4: {
      enum3 = 'dont-need';
      break;
    }
    case 5: {
      enum3 = 'no-reuse';
      break;
    }
    default: {
      throw new TypeError('invalid discriminant specified for Advice');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.advise"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.advise');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.advise(BigInt.asUintN(64, arg1), BigInt.asUintN(64, arg2), enum3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.advise"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg4 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg4 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg4 + 1, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.advise"][Instruction::Return]', {
    funcName: '[method]descriptor.advise',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline75(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.sync-data"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.sync-data');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.syncData()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.sync-data"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'access': {
          enum3 = 0;
          break;
        }
        case 'would-block': {
          enum3 = 1;
          break;
        }
        case 'already': {
          enum3 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum3 = 3;
          break;
        }
        case 'busy': {
          enum3 = 4;
          break;
        }
        case 'deadlock': {
          enum3 = 5;
          break;
        }
        case 'quota': {
          enum3 = 6;
          break;
        }
        case 'exist': {
          enum3 = 7;
          break;
        }
        case 'file-too-large': {
          enum3 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum3 = 9;
          break;
        }
        case 'in-progress': {
          enum3 = 10;
          break;
        }
        case 'interrupted': {
          enum3 = 11;
          break;
        }
        case 'invalid': {
          enum3 = 12;
          break;
        }
        case 'io': {
          enum3 = 13;
          break;
        }
        case 'is-directory': {
          enum3 = 14;
          break;
        }
        case 'loop': {
          enum3 = 15;
          break;
        }
        case 'too-many-links': {
          enum3 = 16;
          break;
        }
        case 'message-size': {
          enum3 = 17;
          break;
        }
        case 'name-too-long': {
          enum3 = 18;
          break;
        }
        case 'no-device': {
          enum3 = 19;
          break;
        }
        case 'no-entry': {
          enum3 = 20;
          break;
        }
        case 'no-lock': {
          enum3 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum3 = 22;
          break;
        }
        case 'insufficient-space': {
          enum3 = 23;
          break;
        }
        case 'not-directory': {
          enum3 = 24;
          break;
        }
        case 'not-empty': {
          enum3 = 25;
          break;
        }
        case 'not-recoverable': {
          enum3 = 26;
          break;
        }
        case 'unsupported': {
          enum3 = 27;
          break;
        }
        case 'no-tty': {
          enum3 = 28;
          break;
        }
        case 'no-such-device': {
          enum3 = 29;
          break;
        }
        case 'overflow': {
          enum3 = 30;
          break;
        }
        case 'not-permitted': {
          enum3 = 31;
          break;
        }
        case 'pipe': {
          enum3 = 32;
          break;
        }
        case 'read-only': {
          enum3 = 33;
          break;
        }
        case 'invalid-seek': {
          enum3 = 34;
          break;
        }
        case 'text-file-busy': {
          enum3 = 35;
          break;
        }
        case 'cross-device': {
          enum3 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.sync-data"][Instruction::Return]', {
    funcName: '[method]descriptor.sync-data',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline76(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.get-type"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.get-type');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.getType()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.get-type"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'block-device': {
          enum3 = 1;
          break;
        }
        case 'character-device': {
          enum3 = 2;
          break;
        }
        case 'directory': {
          enum3 = 3;
          break;
        }
        case 'fifo': {
          enum3 = 4;
          break;
        }
        case 'symbolic-link': {
          enum3 = 5;
          break;
        }
        case 'regular-file': {
          enum3 = 6;
          break;
        }
        case 'socket': {
          enum3 = 7;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of descriptor-type`);
        }
      }
      dataView(memory1).setInt8(arg1 + 1, enum3, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 1, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.get-type"][Instruction::Return]', {
    funcName: '[method]descriptor.get-type',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline77(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.set-size"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.set-size');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.setSize(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.set-size"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'access': {
          enum3 = 0;
          break;
        }
        case 'would-block': {
          enum3 = 1;
          break;
        }
        case 'already': {
          enum3 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum3 = 3;
          break;
        }
        case 'busy': {
          enum3 = 4;
          break;
        }
        case 'deadlock': {
          enum3 = 5;
          break;
        }
        case 'quota': {
          enum3 = 6;
          break;
        }
        case 'exist': {
          enum3 = 7;
          break;
        }
        case 'file-too-large': {
          enum3 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum3 = 9;
          break;
        }
        case 'in-progress': {
          enum3 = 10;
          break;
        }
        case 'interrupted': {
          enum3 = 11;
          break;
        }
        case 'invalid': {
          enum3 = 12;
          break;
        }
        case 'io': {
          enum3 = 13;
          break;
        }
        case 'is-directory': {
          enum3 = 14;
          break;
        }
        case 'loop': {
          enum3 = 15;
          break;
        }
        case 'too-many-links': {
          enum3 = 16;
          break;
        }
        case 'message-size': {
          enum3 = 17;
          break;
        }
        case 'name-too-long': {
          enum3 = 18;
          break;
        }
        case 'no-device': {
          enum3 = 19;
          break;
        }
        case 'no-entry': {
          enum3 = 20;
          break;
        }
        case 'no-lock': {
          enum3 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum3 = 22;
          break;
        }
        case 'insufficient-space': {
          enum3 = 23;
          break;
        }
        case 'not-directory': {
          enum3 = 24;
          break;
        }
        case 'not-empty': {
          enum3 = 25;
          break;
        }
        case 'not-recoverable': {
          enum3 = 26;
          break;
        }
        case 'unsupported': {
          enum3 = 27;
          break;
        }
        case 'no-tty': {
          enum3 = 28;
          break;
        }
        case 'no-such-device': {
          enum3 = 29;
          break;
        }
        case 'overflow': {
          enum3 = 30;
          break;
        }
        case 'not-permitted': {
          enum3 = 31;
          break;
        }
        case 'pipe': {
          enum3 = 32;
          break;
        }
        case 'read-only': {
          enum3 = 33;
          break;
        }
        case 'invalid-seek': {
          enum3 = 34;
          break;
        }
        case 'text-file-busy': {
          enum3 = 35;
          break;
        }
        case 'cross-device': {
          enum3 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.set-size"][Instruction::Return]', {
    funcName: '[method]descriptor.set-size',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline78(arg0, arg1, arg2, arg3, arg4) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = new Uint8Array(memory1.buffer.slice(ptr3, ptr3 + len3 * 1));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.write"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.write');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.write(result3, BigInt.asUintN(64, arg3))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.write"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg4 + 0, 0, true);
      dataView(memory1).setBigInt64(arg4 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg4 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg4 + 8, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.write"][Instruction::Return]', {
    funcName: '[method]descriptor.write',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}

const handleTable22 = [T_FLAG, 0];
handleTables[22] = handleTable22;

function trampoline79(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable22[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable0.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Error$1.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="filesystem-error-code"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'filesystem-error-code');
  const ret = filesystemErrorCode(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="filesystem-error-code"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  if (variant4 === null || variant4=== undefined) {
    dataView(memory1).setInt8(arg1 + 0, 0, true);
  } else {
    const e = variant4;
    dataView(memory1).setInt8(arg1 + 0, 1, true);
    var val3 = e;
    let enum3;
    switch (val3) {
      case 'access': {
        enum3 = 0;
        break;
      }
      case 'would-block': {
        enum3 = 1;
        break;
      }
      case 'already': {
        enum3 = 2;
        break;
      }
      case 'bad-descriptor': {
        enum3 = 3;
        break;
      }
      case 'busy': {
        enum3 = 4;
        break;
      }
      case 'deadlock': {
        enum3 = 5;
        break;
      }
      case 'quota': {
        enum3 = 6;
        break;
      }
      case 'exist': {
        enum3 = 7;
        break;
      }
      case 'file-too-large': {
        enum3 = 8;
        break;
      }
      case 'illegal-byte-sequence': {
        enum3 = 9;
        break;
      }
      case 'in-progress': {
        enum3 = 10;
        break;
      }
      case 'interrupted': {
        enum3 = 11;
        break;
      }
      case 'invalid': {
        enum3 = 12;
        break;
      }
      case 'io': {
        enum3 = 13;
        break;
      }
      case 'is-directory': {
        enum3 = 14;
        break;
      }
      case 'loop': {
        enum3 = 15;
        break;
      }
      case 'too-many-links': {
        enum3 = 16;
        break;
      }
      case 'message-size': {
        enum3 = 17;
        break;
      }
      case 'name-too-long': {
        enum3 = 18;
        break;
      }
      case 'no-device': {
        enum3 = 19;
        break;
      }
      case 'no-entry': {
        enum3 = 20;
        break;
      }
      case 'no-lock': {
        enum3 = 21;
        break;
      }
      case 'insufficient-memory': {
        enum3 = 22;
        break;
      }
      case 'insufficient-space': {
        enum3 = 23;
        break;
      }
      case 'not-directory': {
        enum3 = 24;
        break;
      }
      case 'not-empty': {
        enum3 = 25;
        break;
      }
      case 'not-recoverable': {
        enum3 = 26;
        break;
      }
      case 'unsupported': {
        enum3 = 27;
        break;
      }
      case 'no-tty': {
        enum3 = 28;
        break;
      }
      case 'no-such-device': {
        enum3 = 29;
        break;
      }
      case 'overflow': {
        enum3 = 30;
        break;
      }
      case 'not-permitted': {
        enum3 = 31;
        break;
      }
      case 'pipe': {
        enum3 = 32;
        break;
      }
      case 'read-only': {
        enum3 = 33;
        break;
      }
      case 'invalid-seek': {
        enum3 = 34;
        break;
      }
      case 'text-file-busy': {
        enum3 = 35;
        break;
      }
      case 'cross-device': {
        enum3 = 36;
        break;
      }
      default: {
        if ((e) instanceof Error) {
          console.error(e);
        }
        
        throw new TypeError(`"${val3}" is not one of the cases of error-code`);
      }
    }
    dataView(memory1).setInt8(arg1 + 1, enum3, true);
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="filesystem-error-code"][Instruction::Return]', {
    funcName: 'filesystem-error-code',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}

const handleTable20 = [T_FLAG, 0];
handleTables[20] = handleTable20;

function trampoline80(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read-directory"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.read-directory');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.readDirectory()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read-directory"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      if (!(e instanceof DirectoryEntryStream)) {
        throw new TypeError('Resource error: Not a valid "DirectoryEntryStream" resource.');
      }
      var handle3 = e[symbolRscHandle];
      if (!handle3) {
        const rep = e[symbolRscRep] || ++captureCnt5;
        captureTable5.set(rep, e);
        handle3 = rscTableCreateOwn(handleTable20, rep);
      }
      dataView(memory1).setInt32(arg1 + 4, handle3, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 4, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read-directory"][Instruction::Return]', {
    funcName: '[method]descriptor.read-directory',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline81(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.sync"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.sync');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.sync()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.sync"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'access': {
          enum3 = 0;
          break;
        }
        case 'would-block': {
          enum3 = 1;
          break;
        }
        case 'already': {
          enum3 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum3 = 3;
          break;
        }
        case 'busy': {
          enum3 = 4;
          break;
        }
        case 'deadlock': {
          enum3 = 5;
          break;
        }
        case 'quota': {
          enum3 = 6;
          break;
        }
        case 'exist': {
          enum3 = 7;
          break;
        }
        case 'file-too-large': {
          enum3 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum3 = 9;
          break;
        }
        case 'in-progress': {
          enum3 = 10;
          break;
        }
        case 'interrupted': {
          enum3 = 11;
          break;
        }
        case 'invalid': {
          enum3 = 12;
          break;
        }
        case 'io': {
          enum3 = 13;
          break;
        }
        case 'is-directory': {
          enum3 = 14;
          break;
        }
        case 'loop': {
          enum3 = 15;
          break;
        }
        case 'too-many-links': {
          enum3 = 16;
          break;
        }
        case 'message-size': {
          enum3 = 17;
          break;
        }
        case 'name-too-long': {
          enum3 = 18;
          break;
        }
        case 'no-device': {
          enum3 = 19;
          break;
        }
        case 'no-entry': {
          enum3 = 20;
          break;
        }
        case 'no-lock': {
          enum3 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum3 = 22;
          break;
        }
        case 'insufficient-space': {
          enum3 = 23;
          break;
        }
        case 'not-directory': {
          enum3 = 24;
          break;
        }
        case 'not-empty': {
          enum3 = 25;
          break;
        }
        case 'not-recoverable': {
          enum3 = 26;
          break;
        }
        case 'unsupported': {
          enum3 = 27;
          break;
        }
        case 'no-tty': {
          enum3 = 28;
          break;
        }
        case 'no-such-device': {
          enum3 = 29;
          break;
        }
        case 'overflow': {
          enum3 = 30;
          break;
        }
        case 'not-permitted': {
          enum3 = 31;
          break;
        }
        case 'pipe': {
          enum3 = 32;
          break;
        }
        case 'read-only': {
          enum3 = 33;
          break;
        }
        case 'invalid-seek': {
          enum3 = 34;
          break;
        }
        case 'text-file-busy': {
          enum3 = 35;
          break;
        }
        case 'cross-device': {
          enum3 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.sync"][Instruction::Return]', {
    funcName: '[method]descriptor.sync',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline82(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr3, len3));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.create-directory-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.create-directory-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.createDirectoryAt(result3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.create-directory-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg3 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg3 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg3 + 1, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.create-directory-at"][Instruction::Return]', {
    funcName: '[method]descriptor.create-directory-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline83(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr3, len3));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.remove-directory-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.remove-directory-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.removeDirectoryAt(result3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.remove-directory-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg3 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg3 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg3 + 1, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.remove-directory-at"][Instruction::Return]', {
    funcName: '[method]descriptor.remove-directory-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline84(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr3, len3));
  var handle5 = arg3;
  var rep6 = handleTable21[(handle5 << 1) + 1] & ~T_FLAG;
  var rsc4 = captureTable4.get(rep6);
  if (!rsc4) {
    rsc4 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc4, symbolRscHandle, { writable: true, value: handle5});
    Object.defineProperty(rsc4, symbolRscRep, { writable: true, value: rep6});
  }
  curResourceBorrows.push(rsc4);
  var ptr7 = arg4;
  var len7 = arg5;
  var result7 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr7, len7));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.rename-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.rename-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.renameAt(result3, rsc4, result7)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.rename-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant9 = ret;
  switch (variant9.tag) {
    case 'ok': {
      const e = variant9.val;
      dataView(memory1).setInt8(arg6 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant9.val;
      dataView(memory1).setInt8(arg6 + 0, 1, true);
      var val8 = e;
      let enum8;
      switch (val8) {
        case 'access': {
          enum8 = 0;
          break;
        }
        case 'would-block': {
          enum8 = 1;
          break;
        }
        case 'already': {
          enum8 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum8 = 3;
          break;
        }
        case 'busy': {
          enum8 = 4;
          break;
        }
        case 'deadlock': {
          enum8 = 5;
          break;
        }
        case 'quota': {
          enum8 = 6;
          break;
        }
        case 'exist': {
          enum8 = 7;
          break;
        }
        case 'file-too-large': {
          enum8 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum8 = 9;
          break;
        }
        case 'in-progress': {
          enum8 = 10;
          break;
        }
        case 'interrupted': {
          enum8 = 11;
          break;
        }
        case 'invalid': {
          enum8 = 12;
          break;
        }
        case 'io': {
          enum8 = 13;
          break;
        }
        case 'is-directory': {
          enum8 = 14;
          break;
        }
        case 'loop': {
          enum8 = 15;
          break;
        }
        case 'too-many-links': {
          enum8 = 16;
          break;
        }
        case 'message-size': {
          enum8 = 17;
          break;
        }
        case 'name-too-long': {
          enum8 = 18;
          break;
        }
        case 'no-device': {
          enum8 = 19;
          break;
        }
        case 'no-entry': {
          enum8 = 20;
          break;
        }
        case 'no-lock': {
          enum8 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum8 = 22;
          break;
        }
        case 'insufficient-space': {
          enum8 = 23;
          break;
        }
        case 'not-directory': {
          enum8 = 24;
          break;
        }
        case 'not-empty': {
          enum8 = 25;
          break;
        }
        case 'not-recoverable': {
          enum8 = 26;
          break;
        }
        case 'unsupported': {
          enum8 = 27;
          break;
        }
        case 'no-tty': {
          enum8 = 28;
          break;
        }
        case 'no-such-device': {
          enum8 = 29;
          break;
        }
        case 'overflow': {
          enum8 = 30;
          break;
        }
        case 'not-permitted': {
          enum8 = 31;
          break;
        }
        case 'pipe': {
          enum8 = 32;
          break;
        }
        case 'read-only': {
          enum8 = 33;
          break;
        }
        case 'invalid-seek': {
          enum8 = 34;
          break;
        }
        case 'text-file-busy': {
          enum8 = 35;
          break;
        }
        case 'cross-device': {
          enum8 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val8}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg6 + 1, enum8, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.rename-at"][Instruction::Return]', {
    funcName: '[method]descriptor.rename-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline85(arg0, arg1, arg2, arg3, arg4, arg5) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr3, len3));
  var ptr4 = arg3;
  var len4 = arg4;
  var result4 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr4, len4));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.symlink-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.symlink-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.symlinkAt(result3, result4)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.symlink-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg5 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg5 + 0, 1, true);
      var val5 = e;
      let enum5;
      switch (val5) {
        case 'access': {
          enum5 = 0;
          break;
        }
        case 'would-block': {
          enum5 = 1;
          break;
        }
        case 'already': {
          enum5 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum5 = 3;
          break;
        }
        case 'busy': {
          enum5 = 4;
          break;
        }
        case 'deadlock': {
          enum5 = 5;
          break;
        }
        case 'quota': {
          enum5 = 6;
          break;
        }
        case 'exist': {
          enum5 = 7;
          break;
        }
        case 'file-too-large': {
          enum5 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum5 = 9;
          break;
        }
        case 'in-progress': {
          enum5 = 10;
          break;
        }
        case 'interrupted': {
          enum5 = 11;
          break;
        }
        case 'invalid': {
          enum5 = 12;
          break;
        }
        case 'io': {
          enum5 = 13;
          break;
        }
        case 'is-directory': {
          enum5 = 14;
          break;
        }
        case 'loop': {
          enum5 = 15;
          break;
        }
        case 'too-many-links': {
          enum5 = 16;
          break;
        }
        case 'message-size': {
          enum5 = 17;
          break;
        }
        case 'name-too-long': {
          enum5 = 18;
          break;
        }
        case 'no-device': {
          enum5 = 19;
          break;
        }
        case 'no-entry': {
          enum5 = 20;
          break;
        }
        case 'no-lock': {
          enum5 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum5 = 22;
          break;
        }
        case 'insufficient-space': {
          enum5 = 23;
          break;
        }
        case 'not-directory': {
          enum5 = 24;
          break;
        }
        case 'not-empty': {
          enum5 = 25;
          break;
        }
        case 'not-recoverable': {
          enum5 = 26;
          break;
        }
        case 'unsupported': {
          enum5 = 27;
          break;
        }
        case 'no-tty': {
          enum5 = 28;
          break;
        }
        case 'no-such-device': {
          enum5 = 29;
          break;
        }
        case 'overflow': {
          enum5 = 30;
          break;
        }
        case 'not-permitted': {
          enum5 = 31;
          break;
        }
        case 'pipe': {
          enum5 = 32;
          break;
        }
        case 'read-only': {
          enum5 = 33;
          break;
        }
        case 'invalid-seek': {
          enum5 = 34;
          break;
        }
        case 'text-file-busy': {
          enum5 = 35;
          break;
        }
        case 'cross-device': {
          enum5 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val5}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg5 + 1, enum5, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.symlink-at"][Instruction::Return]', {
    funcName: '[method]descriptor.symlink-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline86(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr3, len3));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.unlink-file-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.unlink-file-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.unlinkFileAt(result3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.unlink-file-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg3 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg3 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg3 + 1, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.unlink-file-at"][Instruction::Return]', {
    funcName: '[method]descriptor.unlink-file-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline87(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read-via-stream"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.read-via-stream');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.readViaStream(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read-via-stream"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      if (!(e instanceof InputStream)) {
        throw new TypeError('Resource error: Not a valid "InputStream" resource.');
      }
      var handle3 = e[symbolRscHandle];
      if (!handle3) {
        const rep = e[symbolRscRep] || ++captureCnt2;
        captureTable2.set(rep, e);
        handle3 = rscTableCreateOwn(handleTable23, rep);
      }
      dataView(memory1).setInt32(arg2 + 4, handle3, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 4, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read-via-stream"][Instruction::Return]', {
    funcName: '[method]descriptor.read-via-stream',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline88(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.write-via-stream"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.write-via-stream');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.writeViaStream(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.write-via-stream"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      if (!(e instanceof OutputStream)) {
        throw new TypeError('Resource error: Not a valid "OutputStream" resource.');
      }
      var handle3 = e[symbolRscHandle];
      if (!handle3) {
        const rep = e[symbolRscRep] || ++captureCnt3;
        captureTable3.set(rep, e);
        handle3 = rscTableCreateOwn(handleTable24, rep);
      }
      dataView(memory1).setInt32(arg2 + 4, handle3, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 4, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.write-via-stream"][Instruction::Return]', {
    funcName: '[method]descriptor.write-via-stream',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline89(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.append-via-stream"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.append-via-stream');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.appendViaStream()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.append-via-stream"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      if (!(e instanceof OutputStream)) {
        throw new TypeError('Resource error: Not a valid "OutputStream" resource.');
      }
      var handle3 = e[symbolRscHandle];
      if (!handle3) {
        const rep = e[symbolRscRep] || ++captureCnt3;
        captureTable3.set(rep, e);
        handle3 = rscTableCreateOwn(handleTable24, rep);
      }
      dataView(memory1).setInt32(arg1 + 4, handle3, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 4, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.append-via-stream"][Instruction::Return]', {
    funcName: '[method]descriptor.append-via-stream',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline90(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.get-flags"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.get-flags');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.getFlags()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.get-flags"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      let flags3 = 0;
      if (typeof e === 'object' && e !== null) {
        flags3 = Boolean(e.read) << 0 | Boolean(e.write) << 1 | Boolean(e.fileIntegritySync) << 2 | Boolean(e.dataIntegritySync) << 3 | Boolean(e.requestedWriteSync) << 4 | Boolean(e.mutateDirectory) << 5;
      } else if (e !== null && e!== undefined) {
        throw new TypeError('only an object, undefined or null can be converted to flags');
      }
      dataView(memory1).setInt8(arg1 + 1, flags3, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 1, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.get-flags"][Instruction::Return]', {
    funcName: '[method]descriptor.get-flags',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline91(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  let variant3;
  switch (arg1) {
    case 0: {
      variant3= {
        tag: 'no-change',
      };
      break;
    }
    case 1: {
      variant3= {
        tag: 'now',
      };
      break;
    }
    case 2: {
      variant3= {
        tag: 'timestamp',
        val: {
          seconds: BigInt.asUintN(64, arg2),
          nanoseconds: arg3 >>> 0,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for NewTimestamp');
    }
  }
  let variant4;
  switch (arg4) {
    case 0: {
      variant4= {
        tag: 'no-change',
      };
      break;
    }
    case 1: {
      variant4= {
        tag: 'now',
      };
      break;
    }
    case 2: {
      variant4= {
        tag: 'timestamp',
        val: {
          seconds: BigInt.asUintN(64, arg5),
          nanoseconds: arg6 >>> 0,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for NewTimestamp');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.set-times"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.set-times');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.setTimes(variant3, variant4)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.set-times"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg7 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg7 + 0, 1, true);
      var val5 = e;
      let enum5;
      switch (val5) {
        case 'access': {
          enum5 = 0;
          break;
        }
        case 'would-block': {
          enum5 = 1;
          break;
        }
        case 'already': {
          enum5 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum5 = 3;
          break;
        }
        case 'busy': {
          enum5 = 4;
          break;
        }
        case 'deadlock': {
          enum5 = 5;
          break;
        }
        case 'quota': {
          enum5 = 6;
          break;
        }
        case 'exist': {
          enum5 = 7;
          break;
        }
        case 'file-too-large': {
          enum5 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum5 = 9;
          break;
        }
        case 'in-progress': {
          enum5 = 10;
          break;
        }
        case 'interrupted': {
          enum5 = 11;
          break;
        }
        case 'invalid': {
          enum5 = 12;
          break;
        }
        case 'io': {
          enum5 = 13;
          break;
        }
        case 'is-directory': {
          enum5 = 14;
          break;
        }
        case 'loop': {
          enum5 = 15;
          break;
        }
        case 'too-many-links': {
          enum5 = 16;
          break;
        }
        case 'message-size': {
          enum5 = 17;
          break;
        }
        case 'name-too-long': {
          enum5 = 18;
          break;
        }
        case 'no-device': {
          enum5 = 19;
          break;
        }
        case 'no-entry': {
          enum5 = 20;
          break;
        }
        case 'no-lock': {
          enum5 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum5 = 22;
          break;
        }
        case 'insufficient-space': {
          enum5 = 23;
          break;
        }
        case 'not-directory': {
          enum5 = 24;
          break;
        }
        case 'not-empty': {
          enum5 = 25;
          break;
        }
        case 'not-recoverable': {
          enum5 = 26;
          break;
        }
        case 'unsupported': {
          enum5 = 27;
          break;
        }
        case 'no-tty': {
          enum5 = 28;
          break;
        }
        case 'no-such-device': {
          enum5 = 29;
          break;
        }
        case 'overflow': {
          enum5 = 30;
          break;
        }
        case 'not-permitted': {
          enum5 = 31;
          break;
        }
        case 'pipe': {
          enum5 = 32;
          break;
        }
        case 'read-only': {
          enum5 = 33;
          break;
        }
        case 'invalid-seek': {
          enum5 = 34;
          break;
        }
        case 'text-file-busy': {
          enum5 = 35;
          break;
        }
        case 'cross-device': {
          enum5 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val5}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg7 + 1, enum5, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.set-times"][Instruction::Return]', {
    funcName: '[method]descriptor.set-times',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline92(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.read');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.read(BigInt.asUintN(64, arg1), BigInt.asUintN(64, arg2))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg3 + 0, 0, true);
      var [tuple3_0, tuple3_1] = e;
      var val4 = tuple3_0;
      var len4 = val4.byteLength;
      var ptr4 = realloc1(0, 0, 1, len4 * 1);
      var src4 = new Uint8Array(val4.buffer || val4, val4.byteOffset, len4 * 1);
      (new Uint8Array(memory1.buffer, ptr4, len4 * 1)).set(src4);
      dataView(memory1).setUint32(arg3 + 8, len4, true);
      dataView(memory1).setUint32(arg3 + 4, ptr4, true);
      dataView(memory1).setInt8(arg3 + 12, tuple3_1 ? 1 : 0, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg3 + 0, 1, true);
      var val5 = e;
      let enum5;
      switch (val5) {
        case 'access': {
          enum5 = 0;
          break;
        }
        case 'would-block': {
          enum5 = 1;
          break;
        }
        case 'already': {
          enum5 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum5 = 3;
          break;
        }
        case 'busy': {
          enum5 = 4;
          break;
        }
        case 'deadlock': {
          enum5 = 5;
          break;
        }
        case 'quota': {
          enum5 = 6;
          break;
        }
        case 'exist': {
          enum5 = 7;
          break;
        }
        case 'file-too-large': {
          enum5 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum5 = 9;
          break;
        }
        case 'in-progress': {
          enum5 = 10;
          break;
        }
        case 'interrupted': {
          enum5 = 11;
          break;
        }
        case 'invalid': {
          enum5 = 12;
          break;
        }
        case 'io': {
          enum5 = 13;
          break;
        }
        case 'is-directory': {
          enum5 = 14;
          break;
        }
        case 'loop': {
          enum5 = 15;
          break;
        }
        case 'too-many-links': {
          enum5 = 16;
          break;
        }
        case 'message-size': {
          enum5 = 17;
          break;
        }
        case 'name-too-long': {
          enum5 = 18;
          break;
        }
        case 'no-device': {
          enum5 = 19;
          break;
        }
        case 'no-entry': {
          enum5 = 20;
          break;
        }
        case 'no-lock': {
          enum5 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum5 = 22;
          break;
        }
        case 'insufficient-space': {
          enum5 = 23;
          break;
        }
        case 'not-directory': {
          enum5 = 24;
          break;
        }
        case 'not-empty': {
          enum5 = 25;
          break;
        }
        case 'not-recoverable': {
          enum5 = 26;
          break;
        }
        case 'unsupported': {
          enum5 = 27;
          break;
        }
        case 'no-tty': {
          enum5 = 28;
          break;
        }
        case 'no-such-device': {
          enum5 = 29;
          break;
        }
        case 'overflow': {
          enum5 = 30;
          break;
        }
        case 'not-permitted': {
          enum5 = 31;
          break;
        }
        case 'pipe': {
          enum5 = 32;
          break;
        }
        case 'read-only': {
          enum5 = 33;
          break;
        }
        case 'invalid-seek': {
          enum5 = 34;
          break;
        }
        case 'text-file-busy': {
          enum5 = 35;
          break;
        }
        case 'cross-device': {
          enum5 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val5}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg3 + 4, enum5, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read"][Instruction::Return]', {
    funcName: '[method]descriptor.read',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline93(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.stat"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.stat');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.stat()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.stat"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant12 = ret;
  switch (variant12.tag) {
    case 'ok': {
      const e = variant12.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      var {type: v3_0, linkCount: v3_1, size: v3_2, dataAccessTimestamp: v3_3, dataModificationTimestamp: v3_4, statusChangeTimestamp: v3_5 } = e;
      var val4 = v3_0;
      let enum4;
      switch (val4) {
        case 'unknown': {
          enum4 = 0;
          break;
        }
        case 'block-device': {
          enum4 = 1;
          break;
        }
        case 'character-device': {
          enum4 = 2;
          break;
        }
        case 'directory': {
          enum4 = 3;
          break;
        }
        case 'fifo': {
          enum4 = 4;
          break;
        }
        case 'symbolic-link': {
          enum4 = 5;
          break;
        }
        case 'regular-file': {
          enum4 = 6;
          break;
        }
        case 'socket': {
          enum4 = 7;
          break;
        }
        default: {
          if ((v3_0) instanceof Error) {
            console.error(v3_0);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of descriptor-type`);
        }
      }
      dataView(memory1).setInt8(arg1 + 8, enum4, true);
      dataView(memory1).setBigInt64(arg1 + 16, toUint64(v3_1), true);
      dataView(memory1).setBigInt64(arg1 + 24, toUint64(v3_2), true);
      var variant6 = v3_3;
      if (variant6 === null || variant6=== undefined) {
        dataView(memory1).setInt8(arg1 + 32, 0, true);
      } else {
        const e = variant6;
        dataView(memory1).setInt8(arg1 + 32, 1, true);
        var {seconds: v5_0, nanoseconds: v5_1 } = e;
        dataView(memory1).setBigInt64(arg1 + 40, toUint64(v5_0), true);
        dataView(memory1).setInt32(arg1 + 48, toUint32(v5_1), true);
      }
      var variant8 = v3_4;
      if (variant8 === null || variant8=== undefined) {
        dataView(memory1).setInt8(arg1 + 56, 0, true);
      } else {
        const e = variant8;
        dataView(memory1).setInt8(arg1 + 56, 1, true);
        var {seconds: v7_0, nanoseconds: v7_1 } = e;
        dataView(memory1).setBigInt64(arg1 + 64, toUint64(v7_0), true);
        dataView(memory1).setInt32(arg1 + 72, toUint32(v7_1), true);
      }
      var variant10 = v3_5;
      if (variant10 === null || variant10=== undefined) {
        dataView(memory1).setInt8(arg1 + 80, 0, true);
      } else {
        const e = variant10;
        dataView(memory1).setInt8(arg1 + 80, 1, true);
        var {seconds: v9_0, nanoseconds: v9_1 } = e;
        dataView(memory1).setBigInt64(arg1 + 88, toUint64(v9_0), true);
        dataView(memory1).setInt32(arg1 + 96, toUint32(v9_1), true);
      }
      break;
    }
    case 'err': {
      const e = variant12.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val11 = e;
      let enum11;
      switch (val11) {
        case 'access': {
          enum11 = 0;
          break;
        }
        case 'would-block': {
          enum11 = 1;
          break;
        }
        case 'already': {
          enum11 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum11 = 3;
          break;
        }
        case 'busy': {
          enum11 = 4;
          break;
        }
        case 'deadlock': {
          enum11 = 5;
          break;
        }
        case 'quota': {
          enum11 = 6;
          break;
        }
        case 'exist': {
          enum11 = 7;
          break;
        }
        case 'file-too-large': {
          enum11 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum11 = 9;
          break;
        }
        case 'in-progress': {
          enum11 = 10;
          break;
        }
        case 'interrupted': {
          enum11 = 11;
          break;
        }
        case 'invalid': {
          enum11 = 12;
          break;
        }
        case 'io': {
          enum11 = 13;
          break;
        }
        case 'is-directory': {
          enum11 = 14;
          break;
        }
        case 'loop': {
          enum11 = 15;
          break;
        }
        case 'too-many-links': {
          enum11 = 16;
          break;
        }
        case 'message-size': {
          enum11 = 17;
          break;
        }
        case 'name-too-long': {
          enum11 = 18;
          break;
        }
        case 'no-device': {
          enum11 = 19;
          break;
        }
        case 'no-entry': {
          enum11 = 20;
          break;
        }
        case 'no-lock': {
          enum11 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum11 = 22;
          break;
        }
        case 'insufficient-space': {
          enum11 = 23;
          break;
        }
        case 'not-directory': {
          enum11 = 24;
          break;
        }
        case 'not-empty': {
          enum11 = 25;
          break;
        }
        case 'not-recoverable': {
          enum11 = 26;
          break;
        }
        case 'unsupported': {
          enum11 = 27;
          break;
        }
        case 'no-tty': {
          enum11 = 28;
          break;
        }
        case 'no-such-device': {
          enum11 = 29;
          break;
        }
        case 'overflow': {
          enum11 = 30;
          break;
        }
        case 'not-permitted': {
          enum11 = 31;
          break;
        }
        case 'pipe': {
          enum11 = 32;
          break;
        }
        case 'read-only': {
          enum11 = 33;
          break;
        }
        case 'invalid-seek': {
          enum11 = 34;
          break;
        }
        case 'text-file-busy': {
          enum11 = 35;
          break;
        }
        case 'cross-device': {
          enum11 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val11}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 8, enum11, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.stat"][Instruction::Return]', {
    funcName: '[method]descriptor.stat',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline94(arg0, arg1, arg2, arg3, arg4) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  if ((arg1 & 4294967294) !== 0) {
    throw new TypeError('flags have extraneous bits set');
  }
  var flags3 = {
    symlinkFollow: Boolean(arg1 & 1),
  };
  var ptr4 = arg2;
  var len4 = arg3;
  var result4 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr4, len4));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.stat-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.stat-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.statAt(flags3, result4)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.stat-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant14 = ret;
  switch (variant14.tag) {
    case 'ok': {
      const e = variant14.val;
      dataView(memory1).setInt8(arg4 + 0, 0, true);
      var {type: v5_0, linkCount: v5_1, size: v5_2, dataAccessTimestamp: v5_3, dataModificationTimestamp: v5_4, statusChangeTimestamp: v5_5 } = e;
      var val6 = v5_0;
      let enum6;
      switch (val6) {
        case 'unknown': {
          enum6 = 0;
          break;
        }
        case 'block-device': {
          enum6 = 1;
          break;
        }
        case 'character-device': {
          enum6 = 2;
          break;
        }
        case 'directory': {
          enum6 = 3;
          break;
        }
        case 'fifo': {
          enum6 = 4;
          break;
        }
        case 'symbolic-link': {
          enum6 = 5;
          break;
        }
        case 'regular-file': {
          enum6 = 6;
          break;
        }
        case 'socket': {
          enum6 = 7;
          break;
        }
        default: {
          if ((v5_0) instanceof Error) {
            console.error(v5_0);
          }
          
          throw new TypeError(`"${val6}" is not one of the cases of descriptor-type`);
        }
      }
      dataView(memory1).setInt8(arg4 + 8, enum6, true);
      dataView(memory1).setBigInt64(arg4 + 16, toUint64(v5_1), true);
      dataView(memory1).setBigInt64(arg4 + 24, toUint64(v5_2), true);
      var variant8 = v5_3;
      if (variant8 === null || variant8=== undefined) {
        dataView(memory1).setInt8(arg4 + 32, 0, true);
      } else {
        const e = variant8;
        dataView(memory1).setInt8(arg4 + 32, 1, true);
        var {seconds: v7_0, nanoseconds: v7_1 } = e;
        dataView(memory1).setBigInt64(arg4 + 40, toUint64(v7_0), true);
        dataView(memory1).setInt32(arg4 + 48, toUint32(v7_1), true);
      }
      var variant10 = v5_4;
      if (variant10 === null || variant10=== undefined) {
        dataView(memory1).setInt8(arg4 + 56, 0, true);
      } else {
        const e = variant10;
        dataView(memory1).setInt8(arg4 + 56, 1, true);
        var {seconds: v9_0, nanoseconds: v9_1 } = e;
        dataView(memory1).setBigInt64(arg4 + 64, toUint64(v9_0), true);
        dataView(memory1).setInt32(arg4 + 72, toUint32(v9_1), true);
      }
      var variant12 = v5_5;
      if (variant12 === null || variant12=== undefined) {
        dataView(memory1).setInt8(arg4 + 80, 0, true);
      } else {
        const e = variant12;
        dataView(memory1).setInt8(arg4 + 80, 1, true);
        var {seconds: v11_0, nanoseconds: v11_1 } = e;
        dataView(memory1).setBigInt64(arg4 + 88, toUint64(v11_0), true);
        dataView(memory1).setInt32(arg4 + 96, toUint32(v11_1), true);
      }
      break;
    }
    case 'err': {
      const e = variant14.val;
      dataView(memory1).setInt8(arg4 + 0, 1, true);
      var val13 = e;
      let enum13;
      switch (val13) {
        case 'access': {
          enum13 = 0;
          break;
        }
        case 'would-block': {
          enum13 = 1;
          break;
        }
        case 'already': {
          enum13 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum13 = 3;
          break;
        }
        case 'busy': {
          enum13 = 4;
          break;
        }
        case 'deadlock': {
          enum13 = 5;
          break;
        }
        case 'quota': {
          enum13 = 6;
          break;
        }
        case 'exist': {
          enum13 = 7;
          break;
        }
        case 'file-too-large': {
          enum13 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum13 = 9;
          break;
        }
        case 'in-progress': {
          enum13 = 10;
          break;
        }
        case 'interrupted': {
          enum13 = 11;
          break;
        }
        case 'invalid': {
          enum13 = 12;
          break;
        }
        case 'io': {
          enum13 = 13;
          break;
        }
        case 'is-directory': {
          enum13 = 14;
          break;
        }
        case 'loop': {
          enum13 = 15;
          break;
        }
        case 'too-many-links': {
          enum13 = 16;
          break;
        }
        case 'message-size': {
          enum13 = 17;
          break;
        }
        case 'name-too-long': {
          enum13 = 18;
          break;
        }
        case 'no-device': {
          enum13 = 19;
          break;
        }
        case 'no-entry': {
          enum13 = 20;
          break;
        }
        case 'no-lock': {
          enum13 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum13 = 22;
          break;
        }
        case 'insufficient-space': {
          enum13 = 23;
          break;
        }
        case 'not-directory': {
          enum13 = 24;
          break;
        }
        case 'not-empty': {
          enum13 = 25;
          break;
        }
        case 'not-recoverable': {
          enum13 = 26;
          break;
        }
        case 'unsupported': {
          enum13 = 27;
          break;
        }
        case 'no-tty': {
          enum13 = 28;
          break;
        }
        case 'no-such-device': {
          enum13 = 29;
          break;
        }
        case 'overflow': {
          enum13 = 30;
          break;
        }
        case 'not-permitted': {
          enum13 = 31;
          break;
        }
        case 'pipe': {
          enum13 = 32;
          break;
        }
        case 'read-only': {
          enum13 = 33;
          break;
        }
        case 'invalid-seek': {
          enum13 = 34;
          break;
        }
        case 'text-file-busy': {
          enum13 = 35;
          break;
        }
        case 'cross-device': {
          enum13 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val13}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg4 + 8, enum13, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.stat-at"][Instruction::Return]', {
    funcName: '[method]descriptor.stat-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline95(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  if ((arg1 & 4294967294) !== 0) {
    throw new TypeError('flags have extraneous bits set');
  }
  var flags3 = {
    symlinkFollow: Boolean(arg1 & 1),
  };
  var ptr4 = arg2;
  var len4 = arg3;
  var result4 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr4, len4));
  let variant5;
  switch (arg4) {
    case 0: {
      variant5= {
        tag: 'no-change',
      };
      break;
    }
    case 1: {
      variant5= {
        tag: 'now',
      };
      break;
    }
    case 2: {
      variant5= {
        tag: 'timestamp',
        val: {
          seconds: BigInt.asUintN(64, arg5),
          nanoseconds: arg6 >>> 0,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for NewTimestamp');
    }
  }
  let variant6;
  switch (arg7) {
    case 0: {
      variant6= {
        tag: 'no-change',
      };
      break;
    }
    case 1: {
      variant6= {
        tag: 'now',
      };
      break;
    }
    case 2: {
      variant6= {
        tag: 'timestamp',
        val: {
          seconds: BigInt.asUintN(64, arg8),
          nanoseconds: arg9 >>> 0,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for NewTimestamp');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.set-times-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.set-times-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.setTimesAt(flags3, result4, variant5, variant6)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.set-times-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant8 = ret;
  switch (variant8.tag) {
    case 'ok': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg10 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg10 + 0, 1, true);
      var val7 = e;
      let enum7;
      switch (val7) {
        case 'access': {
          enum7 = 0;
          break;
        }
        case 'would-block': {
          enum7 = 1;
          break;
        }
        case 'already': {
          enum7 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum7 = 3;
          break;
        }
        case 'busy': {
          enum7 = 4;
          break;
        }
        case 'deadlock': {
          enum7 = 5;
          break;
        }
        case 'quota': {
          enum7 = 6;
          break;
        }
        case 'exist': {
          enum7 = 7;
          break;
        }
        case 'file-too-large': {
          enum7 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum7 = 9;
          break;
        }
        case 'in-progress': {
          enum7 = 10;
          break;
        }
        case 'interrupted': {
          enum7 = 11;
          break;
        }
        case 'invalid': {
          enum7 = 12;
          break;
        }
        case 'io': {
          enum7 = 13;
          break;
        }
        case 'is-directory': {
          enum7 = 14;
          break;
        }
        case 'loop': {
          enum7 = 15;
          break;
        }
        case 'too-many-links': {
          enum7 = 16;
          break;
        }
        case 'message-size': {
          enum7 = 17;
          break;
        }
        case 'name-too-long': {
          enum7 = 18;
          break;
        }
        case 'no-device': {
          enum7 = 19;
          break;
        }
        case 'no-entry': {
          enum7 = 20;
          break;
        }
        case 'no-lock': {
          enum7 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum7 = 22;
          break;
        }
        case 'insufficient-space': {
          enum7 = 23;
          break;
        }
        case 'not-directory': {
          enum7 = 24;
          break;
        }
        case 'not-empty': {
          enum7 = 25;
          break;
        }
        case 'not-recoverable': {
          enum7 = 26;
          break;
        }
        case 'unsupported': {
          enum7 = 27;
          break;
        }
        case 'no-tty': {
          enum7 = 28;
          break;
        }
        case 'no-such-device': {
          enum7 = 29;
          break;
        }
        case 'overflow': {
          enum7 = 30;
          break;
        }
        case 'not-permitted': {
          enum7 = 31;
          break;
        }
        case 'pipe': {
          enum7 = 32;
          break;
        }
        case 'read-only': {
          enum7 = 33;
          break;
        }
        case 'invalid-seek': {
          enum7 = 34;
          break;
        }
        case 'text-file-busy': {
          enum7 = 35;
          break;
        }
        case 'cross-device': {
          enum7 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val7}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg10 + 1, enum7, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.set-times-at"][Instruction::Return]', {
    funcName: '[method]descriptor.set-times-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline96(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  if ((arg1 & 4294967294) !== 0) {
    throw new TypeError('flags have extraneous bits set');
  }
  var flags3 = {
    symlinkFollow: Boolean(arg1 & 1),
  };
  var ptr4 = arg2;
  var len4 = arg3;
  var result4 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr4, len4));
  var handle6 = arg4;
  var rep7 = handleTable21[(handle6 << 1) + 1] & ~T_FLAG;
  var rsc5 = captureTable4.get(rep7);
  if (!rsc5) {
    rsc5 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc5, symbolRscHandle, { writable: true, value: handle6});
    Object.defineProperty(rsc5, symbolRscRep, { writable: true, value: rep7});
  }
  curResourceBorrows.push(rsc5);
  var ptr8 = arg5;
  var len8 = arg6;
  var result8 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr8, len8));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.link-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.link-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.linkAt(flags3, result4, rsc5, result8)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.link-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant10 = ret;
  switch (variant10.tag) {
    case 'ok': {
      const e = variant10.val;
      dataView(memory1).setInt8(arg7 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant10.val;
      dataView(memory1).setInt8(arg7 + 0, 1, true);
      var val9 = e;
      let enum9;
      switch (val9) {
        case 'access': {
          enum9 = 0;
          break;
        }
        case 'would-block': {
          enum9 = 1;
          break;
        }
        case 'already': {
          enum9 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum9 = 3;
          break;
        }
        case 'busy': {
          enum9 = 4;
          break;
        }
        case 'deadlock': {
          enum9 = 5;
          break;
        }
        case 'quota': {
          enum9 = 6;
          break;
        }
        case 'exist': {
          enum9 = 7;
          break;
        }
        case 'file-too-large': {
          enum9 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum9 = 9;
          break;
        }
        case 'in-progress': {
          enum9 = 10;
          break;
        }
        case 'interrupted': {
          enum9 = 11;
          break;
        }
        case 'invalid': {
          enum9 = 12;
          break;
        }
        case 'io': {
          enum9 = 13;
          break;
        }
        case 'is-directory': {
          enum9 = 14;
          break;
        }
        case 'loop': {
          enum9 = 15;
          break;
        }
        case 'too-many-links': {
          enum9 = 16;
          break;
        }
        case 'message-size': {
          enum9 = 17;
          break;
        }
        case 'name-too-long': {
          enum9 = 18;
          break;
        }
        case 'no-device': {
          enum9 = 19;
          break;
        }
        case 'no-entry': {
          enum9 = 20;
          break;
        }
        case 'no-lock': {
          enum9 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum9 = 22;
          break;
        }
        case 'insufficient-space': {
          enum9 = 23;
          break;
        }
        case 'not-directory': {
          enum9 = 24;
          break;
        }
        case 'not-empty': {
          enum9 = 25;
          break;
        }
        case 'not-recoverable': {
          enum9 = 26;
          break;
        }
        case 'unsupported': {
          enum9 = 27;
          break;
        }
        case 'no-tty': {
          enum9 = 28;
          break;
        }
        case 'no-such-device': {
          enum9 = 29;
          break;
        }
        case 'overflow': {
          enum9 = 30;
          break;
        }
        case 'not-permitted': {
          enum9 = 31;
          break;
        }
        case 'pipe': {
          enum9 = 32;
          break;
        }
        case 'read-only': {
          enum9 = 33;
          break;
        }
        case 'invalid-seek': {
          enum9 = 34;
          break;
        }
        case 'text-file-busy': {
          enum9 = 35;
          break;
        }
        case 'cross-device': {
          enum9 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val9}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg7 + 1, enum9, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.link-at"][Instruction::Return]', {
    funcName: '[method]descriptor.link-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline97(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  if ((arg1 & 4294967294) !== 0) {
    throw new TypeError('flags have extraneous bits set');
  }
  var flags3 = {
    symlinkFollow: Boolean(arg1 & 1),
  };
  var ptr4 = arg2;
  var len4 = arg3;
  var result4 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr4, len4));
  if ((arg4 & 4294967280) !== 0) {
    throw new TypeError('flags have extraneous bits set');
  }
  var flags5 = {
    create: Boolean(arg4 & 1),
    directory: Boolean(arg4 & 2),
    exclusive: Boolean(arg4 & 4),
    truncate: Boolean(arg4 & 8),
  };
  if ((arg5 & 4294967232) !== 0) {
    throw new TypeError('flags have extraneous bits set');
  }
  var flags6 = {
    read: Boolean(arg5 & 1),
    write: Boolean(arg5 & 2),
    fileIntegritySync: Boolean(arg5 & 4),
    dataIntegritySync: Boolean(arg5 & 8),
    requestedWriteSync: Boolean(arg5 & 16),
    mutateDirectory: Boolean(arg5 & 32),
  };
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.open-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.open-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.openAt(flags3, result4, flags5, flags6)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.open-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant9 = ret;
  switch (variant9.tag) {
    case 'ok': {
      const e = variant9.val;
      dataView(memory1).setInt8(arg6 + 0, 0, true);
      if (!(e instanceof Descriptor)) {
        throw new TypeError('Resource error: Not a valid "Descriptor" resource.');
      }
      var handle7 = e[symbolRscHandle];
      if (!handle7) {
        const rep = e[symbolRscRep] || ++captureCnt4;
        captureTable4.set(rep, e);
        handle7 = rscTableCreateOwn(handleTable21, rep);
      }
      dataView(memory1).setInt32(arg6 + 4, handle7, true);
      break;
    }
    case 'err': {
      const e = variant9.val;
      dataView(memory1).setInt8(arg6 + 0, 1, true);
      var val8 = e;
      let enum8;
      switch (val8) {
        case 'access': {
          enum8 = 0;
          break;
        }
        case 'would-block': {
          enum8 = 1;
          break;
        }
        case 'already': {
          enum8 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum8 = 3;
          break;
        }
        case 'busy': {
          enum8 = 4;
          break;
        }
        case 'deadlock': {
          enum8 = 5;
          break;
        }
        case 'quota': {
          enum8 = 6;
          break;
        }
        case 'exist': {
          enum8 = 7;
          break;
        }
        case 'file-too-large': {
          enum8 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum8 = 9;
          break;
        }
        case 'in-progress': {
          enum8 = 10;
          break;
        }
        case 'interrupted': {
          enum8 = 11;
          break;
        }
        case 'invalid': {
          enum8 = 12;
          break;
        }
        case 'io': {
          enum8 = 13;
          break;
        }
        case 'is-directory': {
          enum8 = 14;
          break;
        }
        case 'loop': {
          enum8 = 15;
          break;
        }
        case 'too-many-links': {
          enum8 = 16;
          break;
        }
        case 'message-size': {
          enum8 = 17;
          break;
        }
        case 'name-too-long': {
          enum8 = 18;
          break;
        }
        case 'no-device': {
          enum8 = 19;
          break;
        }
        case 'no-entry': {
          enum8 = 20;
          break;
        }
        case 'no-lock': {
          enum8 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum8 = 22;
          break;
        }
        case 'insufficient-space': {
          enum8 = 23;
          break;
        }
        case 'not-directory': {
          enum8 = 24;
          break;
        }
        case 'not-empty': {
          enum8 = 25;
          break;
        }
        case 'not-recoverable': {
          enum8 = 26;
          break;
        }
        case 'unsupported': {
          enum8 = 27;
          break;
        }
        case 'no-tty': {
          enum8 = 28;
          break;
        }
        case 'no-such-device': {
          enum8 = 29;
          break;
        }
        case 'overflow': {
          enum8 = 30;
          break;
        }
        case 'not-permitted': {
          enum8 = 31;
          break;
        }
        case 'pipe': {
          enum8 = 32;
          break;
        }
        case 'read-only': {
          enum8 = 33;
          break;
        }
        case 'invalid-seek': {
          enum8 = 34;
          break;
        }
        case 'text-file-busy': {
          enum8 = 35;
          break;
        }
        case 'cross-device': {
          enum8 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val8}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg6 + 4, enum8, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.open-at"][Instruction::Return]', {
    funcName: '[method]descriptor.open-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline98(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr3, len3));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.readlink-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.readlink-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.readlinkAt(result3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.readlink-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg3 + 0, 0, true);
      var ptr4 = utf8Encode(e, realloc1, memory1);
      var len4 = utf8EncodedLen;
      dataView(memory1).setUint32(arg3 + 8, len4, true);
      dataView(memory1).setUint32(arg3 + 4, ptr4, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg3 + 0, 1, true);
      var val5 = e;
      let enum5;
      switch (val5) {
        case 'access': {
          enum5 = 0;
          break;
        }
        case 'would-block': {
          enum5 = 1;
          break;
        }
        case 'already': {
          enum5 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum5 = 3;
          break;
        }
        case 'busy': {
          enum5 = 4;
          break;
        }
        case 'deadlock': {
          enum5 = 5;
          break;
        }
        case 'quota': {
          enum5 = 6;
          break;
        }
        case 'exist': {
          enum5 = 7;
          break;
        }
        case 'file-too-large': {
          enum5 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum5 = 9;
          break;
        }
        case 'in-progress': {
          enum5 = 10;
          break;
        }
        case 'interrupted': {
          enum5 = 11;
          break;
        }
        case 'invalid': {
          enum5 = 12;
          break;
        }
        case 'io': {
          enum5 = 13;
          break;
        }
        case 'is-directory': {
          enum5 = 14;
          break;
        }
        case 'loop': {
          enum5 = 15;
          break;
        }
        case 'too-many-links': {
          enum5 = 16;
          break;
        }
        case 'message-size': {
          enum5 = 17;
          break;
        }
        case 'name-too-long': {
          enum5 = 18;
          break;
        }
        case 'no-device': {
          enum5 = 19;
          break;
        }
        case 'no-entry': {
          enum5 = 20;
          break;
        }
        case 'no-lock': {
          enum5 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum5 = 22;
          break;
        }
        case 'insufficient-space': {
          enum5 = 23;
          break;
        }
        case 'not-directory': {
          enum5 = 24;
          break;
        }
        case 'not-empty': {
          enum5 = 25;
          break;
        }
        case 'not-recoverable': {
          enum5 = 26;
          break;
        }
        case 'unsupported': {
          enum5 = 27;
          break;
        }
        case 'no-tty': {
          enum5 = 28;
          break;
        }
        case 'no-such-device': {
          enum5 = 29;
          break;
        }
        case 'overflow': {
          enum5 = 30;
          break;
        }
        case 'not-permitted': {
          enum5 = 31;
          break;
        }
        case 'pipe': {
          enum5 = 32;
          break;
        }
        case 'read-only': {
          enum5 = 33;
          break;
        }
        case 'invalid-seek': {
          enum5 = 34;
          break;
        }
        case 'text-file-busy': {
          enum5 = 35;
          break;
        }
        case 'cross-device': {
          enum5 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val5}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg3 + 4, enum5, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.readlink-at"][Instruction::Return]', {
    funcName: '[method]descriptor.readlink-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline99(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.metadata-hash"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.metadata-hash');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.metadataHash()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.metadata-hash"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      var {lower: v3_0, upper: v3_1 } = e;
      dataView(memory1).setBigInt64(arg1 + 8, toUint64(v3_0), true);
      dataView(memory1).setBigInt64(arg1 + 16, toUint64(v3_1), true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'access': {
          enum4 = 0;
          break;
        }
        case 'would-block': {
          enum4 = 1;
          break;
        }
        case 'already': {
          enum4 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum4 = 3;
          break;
        }
        case 'busy': {
          enum4 = 4;
          break;
        }
        case 'deadlock': {
          enum4 = 5;
          break;
        }
        case 'quota': {
          enum4 = 6;
          break;
        }
        case 'exist': {
          enum4 = 7;
          break;
        }
        case 'file-too-large': {
          enum4 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum4 = 9;
          break;
        }
        case 'in-progress': {
          enum4 = 10;
          break;
        }
        case 'interrupted': {
          enum4 = 11;
          break;
        }
        case 'invalid': {
          enum4 = 12;
          break;
        }
        case 'io': {
          enum4 = 13;
          break;
        }
        case 'is-directory': {
          enum4 = 14;
          break;
        }
        case 'loop': {
          enum4 = 15;
          break;
        }
        case 'too-many-links': {
          enum4 = 16;
          break;
        }
        case 'message-size': {
          enum4 = 17;
          break;
        }
        case 'name-too-long': {
          enum4 = 18;
          break;
        }
        case 'no-device': {
          enum4 = 19;
          break;
        }
        case 'no-entry': {
          enum4 = 20;
          break;
        }
        case 'no-lock': {
          enum4 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum4 = 22;
          break;
        }
        case 'insufficient-space': {
          enum4 = 23;
          break;
        }
        case 'not-directory': {
          enum4 = 24;
          break;
        }
        case 'not-empty': {
          enum4 = 25;
          break;
        }
        case 'not-recoverable': {
          enum4 = 26;
          break;
        }
        case 'unsupported': {
          enum4 = 27;
          break;
        }
        case 'no-tty': {
          enum4 = 28;
          break;
        }
        case 'no-such-device': {
          enum4 = 29;
          break;
        }
        case 'overflow': {
          enum4 = 30;
          break;
        }
        case 'not-permitted': {
          enum4 = 31;
          break;
        }
        case 'pipe': {
          enum4 = 32;
          break;
        }
        case 'read-only': {
          enum4 = 33;
          break;
        }
        case 'invalid-seek': {
          enum4 = 34;
          break;
        }
        case 'text-file-busy': {
          enum4 = 35;
          break;
        }
        case 'cross-device': {
          enum4 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 8, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.metadata-hash"][Instruction::Return]', {
    funcName: '[method]descriptor.metadata-hash',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline100(arg0, arg1, arg2, arg3, arg4) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  if ((arg1 & 4294967294) !== 0) {
    throw new TypeError('flags have extraneous bits set');
  }
  var flags3 = {
    symlinkFollow: Boolean(arg1 & 1),
  };
  var ptr4 = arg2;
  var len4 = arg3;
  var result4 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr4, len4));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.metadata-hash-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.metadata-hash-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.metadataHashAt(flags3, result4)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.metadata-hash-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant7 = ret;
  switch (variant7.tag) {
    case 'ok': {
      const e = variant7.val;
      dataView(memory1).setInt8(arg4 + 0, 0, true);
      var {lower: v5_0, upper: v5_1 } = e;
      dataView(memory1).setBigInt64(arg4 + 8, toUint64(v5_0), true);
      dataView(memory1).setBigInt64(arg4 + 16, toUint64(v5_1), true);
      break;
    }
    case 'err': {
      const e = variant7.val;
      dataView(memory1).setInt8(arg4 + 0, 1, true);
      var val6 = e;
      let enum6;
      switch (val6) {
        case 'access': {
          enum6 = 0;
          break;
        }
        case 'would-block': {
          enum6 = 1;
          break;
        }
        case 'already': {
          enum6 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum6 = 3;
          break;
        }
        case 'busy': {
          enum6 = 4;
          break;
        }
        case 'deadlock': {
          enum6 = 5;
          break;
        }
        case 'quota': {
          enum6 = 6;
          break;
        }
        case 'exist': {
          enum6 = 7;
          break;
        }
        case 'file-too-large': {
          enum6 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum6 = 9;
          break;
        }
        case 'in-progress': {
          enum6 = 10;
          break;
        }
        case 'interrupted': {
          enum6 = 11;
          break;
        }
        case 'invalid': {
          enum6 = 12;
          break;
        }
        case 'io': {
          enum6 = 13;
          break;
        }
        case 'is-directory': {
          enum6 = 14;
          break;
        }
        case 'loop': {
          enum6 = 15;
          break;
        }
        case 'too-many-links': {
          enum6 = 16;
          break;
        }
        case 'message-size': {
          enum6 = 17;
          break;
        }
        case 'name-too-long': {
          enum6 = 18;
          break;
        }
        case 'no-device': {
          enum6 = 19;
          break;
        }
        case 'no-entry': {
          enum6 = 20;
          break;
        }
        case 'no-lock': {
          enum6 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum6 = 22;
          break;
        }
        case 'insufficient-space': {
          enum6 = 23;
          break;
        }
        case 'not-directory': {
          enum6 = 24;
          break;
        }
        case 'not-empty': {
          enum6 = 25;
          break;
        }
        case 'not-recoverable': {
          enum6 = 26;
          break;
        }
        case 'unsupported': {
          enum6 = 27;
          break;
        }
        case 'no-tty': {
          enum6 = 28;
          break;
        }
        case 'no-such-device': {
          enum6 = 29;
          break;
        }
        case 'overflow': {
          enum6 = 30;
          break;
        }
        case 'not-permitted': {
          enum6 = 31;
          break;
        }
        case 'pipe': {
          enum6 = 32;
          break;
        }
        case 'read-only': {
          enum6 = 33;
          break;
        }
        case 'invalid-seek': {
          enum6 = 34;
          break;
        }
        case 'text-file-busy': {
          enum6 = 35;
          break;
        }
        case 'cross-device': {
          enum6 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val6}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg4 + 8, enum6, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.metadata-hash-at"][Instruction::Return]', {
    funcName: '[method]descriptor.metadata-hash-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline101(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable20[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable5.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(DirectoryEntryStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]directory-entry-stream.read-directory-entry"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]directory-entry-stream.read-directory-entry');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.readDirectoryEntry()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]directory-entry-stream.read-directory-entry"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant8 = ret;
  switch (variant8.tag) {
    case 'ok': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      var variant6 = e;
      if (variant6 === null || variant6=== undefined) {
        dataView(memory1).setInt8(arg1 + 4, 0, true);
      } else {
        const e = variant6;
        dataView(memory1).setInt8(arg1 + 4, 1, true);
        var {type: v3_0, name: v3_1 } = e;
        var val4 = v3_0;
        let enum4;
        switch (val4) {
          case 'unknown': {
            enum4 = 0;
            break;
          }
          case 'block-device': {
            enum4 = 1;
            break;
          }
          case 'character-device': {
            enum4 = 2;
            break;
          }
          case 'directory': {
            enum4 = 3;
            break;
          }
          case 'fifo': {
            enum4 = 4;
            break;
          }
          case 'symbolic-link': {
            enum4 = 5;
            break;
          }
          case 'regular-file': {
            enum4 = 6;
            break;
          }
          case 'socket': {
            enum4 = 7;
            break;
          }
          default: {
            if ((v3_0) instanceof Error) {
              console.error(v3_0);
            }
            
            throw new TypeError(`"${val4}" is not one of the cases of descriptor-type`);
          }
        }
        dataView(memory1).setInt8(arg1 + 8, enum4, true);
        var ptr5 = utf8Encode(v3_1, realloc1, memory1);
        var len5 = utf8EncodedLen;
        dataView(memory1).setUint32(arg1 + 16, len5, true);
        dataView(memory1).setUint32(arg1 + 12, ptr5, true);
      }
      break;
    }
    case 'err': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val7 = e;
      let enum7;
      switch (val7) {
        case 'access': {
          enum7 = 0;
          break;
        }
        case 'would-block': {
          enum7 = 1;
          break;
        }
        case 'already': {
          enum7 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum7 = 3;
          break;
        }
        case 'busy': {
          enum7 = 4;
          break;
        }
        case 'deadlock': {
          enum7 = 5;
          break;
        }
        case 'quota': {
          enum7 = 6;
          break;
        }
        case 'exist': {
          enum7 = 7;
          break;
        }
        case 'file-too-large': {
          enum7 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum7 = 9;
          break;
        }
        case 'in-progress': {
          enum7 = 10;
          break;
        }
        case 'interrupted': {
          enum7 = 11;
          break;
        }
        case 'invalid': {
          enum7 = 12;
          break;
        }
        case 'io': {
          enum7 = 13;
          break;
        }
        case 'is-directory': {
          enum7 = 14;
          break;
        }
        case 'loop': {
          enum7 = 15;
          break;
        }
        case 'too-many-links': {
          enum7 = 16;
          break;
        }
        case 'message-size': {
          enum7 = 17;
          break;
        }
        case 'name-too-long': {
          enum7 = 18;
          break;
        }
        case 'no-device': {
          enum7 = 19;
          break;
        }
        case 'no-entry': {
          enum7 = 20;
          break;
        }
        case 'no-lock': {
          enum7 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum7 = 22;
          break;
        }
        case 'insufficient-space': {
          enum7 = 23;
          break;
        }
        case 'not-directory': {
          enum7 = 24;
          break;
        }
        case 'not-empty': {
          enum7 = 25;
          break;
        }
        case 'not-recoverable': {
          enum7 = 26;
          break;
        }
        case 'unsupported': {
          enum7 = 27;
          break;
        }
        case 'no-tty': {
          enum7 = 28;
          break;
        }
        case 'no-such-device': {
          enum7 = 29;
          break;
        }
        case 'overflow': {
          enum7 = 30;
          break;
        }
        case 'not-permitted': {
          enum7 = 31;
          break;
        }
        case 'pipe': {
          enum7 = 32;
          break;
        }
        case 'read-only': {
          enum7 = 33;
          break;
        }
        case 'invalid-seek': {
          enum7 = 34;
          break;
        }
        case 'text-file-busy': {
          enum7 = 35;
          break;
        }
        case 'cross-device': {
          enum7 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val7}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 4, enum7, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]directory-entry-stream.read-directory-entry"][Instruction::Return]', {
    funcName: '[method]directory-entry-stream.read-directory-entry',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline102(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable23[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable2.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(InputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.read"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]input-stream.read');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.read(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.read"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      var val3 = e;
      var len3 = val3.byteLength;
      var ptr3 = realloc1(0, 0, 1, len3 * 1);
      var src3 = new Uint8Array(val3.buffer || val3, val3.byteOffset, len3 * 1);
      (new Uint8Array(memory1.buffer, ptr3, len3 * 1)).set(src3);
      dataView(memory1).setUint32(arg2 + 8, len3, true);
      dataView(memory1).setUint32(arg2 + 4, ptr3, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var variant5 = e;
      switch (variant5.tag) {
        case 'last-operation-failed': {
          const e = variant5.val;
          dataView(memory1).setInt8(arg2 + 4, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle4 = e[symbolRscHandle];
          if (!handle4) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle4 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg2 + 8, handle4, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg2 + 4, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.read"][Instruction::Return]', {
    funcName: '[method]input-stream.read',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline103(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable23[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable2.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(InputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.blocking-read"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]input-stream.blocking-read');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.blockingRead(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.blocking-read"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      var val3 = e;
      var len3 = val3.byteLength;
      var ptr3 = realloc1(0, 0, 1, len3 * 1);
      var src3 = new Uint8Array(val3.buffer || val3, val3.byteOffset, len3 * 1);
      (new Uint8Array(memory1.buffer, ptr3, len3 * 1)).set(src3);
      dataView(memory1).setUint32(arg2 + 8, len3, true);
      dataView(memory1).setUint32(arg2 + 4, ptr3, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var variant5 = e;
      switch (variant5.tag) {
        case 'last-operation-failed': {
          const e = variant5.val;
          dataView(memory1).setInt8(arg2 + 4, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle4 = e[symbolRscHandle];
          if (!handle4) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle4 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg2 + 8, handle4, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg2 + 4, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.blocking-read"][Instruction::Return]', {
    funcName: '[method]input-stream.blocking-read',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline104(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable24[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable3.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.check-write"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]output-stream.check-write');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.checkWrite()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.check-write"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      dataView(memory1).setBigInt64(arg1 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var variant4 = e;
      switch (variant4.tag) {
        case 'last-operation-failed': {
          const e = variant4.val;
          dataView(memory1).setInt8(arg1 + 8, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle3 = e[symbolRscHandle];
          if (!handle3) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle3 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg1 + 12, handle3, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg1 + 8, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant4.tag)}\` (received \`${variant4}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.check-write"][Instruction::Return]', {
    funcName: '[method]output-stream.check-write',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline105(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable24[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable3.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = new Uint8Array(memory1.buffer.slice(ptr3, ptr3 + len3 * 1));
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.write"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]output-stream.write');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.write(result3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.write"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg3 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg3 + 0, 1, true);
      var variant5 = e;
      switch (variant5.tag) {
        case 'last-operation-failed': {
          const e = variant5.val;
          dataView(memory1).setInt8(arg3 + 4, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle4 = e[symbolRscHandle];
          if (!handle4) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle4 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg3 + 8, handle4, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg3 + 4, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.write"][Instruction::Return]', {
    funcName: '[method]output-stream.write',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline106(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable24[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable3.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = new Uint8Array(memory1.buffer.slice(ptr3, ptr3 + len3 * 1));
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-write-and-flush"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]output-stream.blocking-write-and-flush');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.blockingWriteAndFlush(result3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-write-and-flush"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg3 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg3 + 0, 1, true);
      var variant5 = e;
      switch (variant5.tag) {
        case 'last-operation-failed': {
          const e = variant5.val;
          dataView(memory1).setInt8(arg3 + 4, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle4 = e[symbolRscHandle];
          if (!handle4) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle4 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg3 + 8, handle4, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg3 + 4, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-write-and-flush"][Instruction::Return]', {
    funcName: '[method]output-stream.blocking-write-and-flush',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline107(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable24[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable3.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-flush"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]output-stream.blocking-flush');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.blockingFlush()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-flush"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var variant4 = e;
      switch (variant4.tag) {
        case 'last-operation-failed': {
          const e = variant4.val;
          dataView(memory1).setInt8(arg1 + 4, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle3 = e[symbolRscHandle];
          if (!handle3) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle3 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg1 + 8, handle3, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg1 + 4, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant4.tag)}\` (received \`${variant4}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-flush"][Instruction::Return]', {
    funcName: '[method]output-stream.blocking-flush',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline108(arg0, arg1, arg2) {
  var len3 = arg1;
  var base3 = arg0;
  var result3 = [];
  for (let i = 0; i < len3; i++) {
    const base = base3 + i * 4;
    var handle1 = dataView(memory1).getInt32(base + 0, true);
    var rep2 = handleTable19[(handle1 << 1) + 1] & ~T_FLAG;
    var rsc0 = captureTable1.get(rep2);
    if (!rsc0) {
      rsc0 = Object.create(Pollable.prototype);
      Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
      Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
    }
    curResourceBorrows.push(rsc0);
    result3.push(rsc0);
  }
  _debugLog('[iface="wasi:io/poll@0.2.0", function="poll"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'poll');
  const ret = poll(result3);
  _debugLog('[iface="wasi:io/poll@0.2.0", function="poll"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var val4 = ret;
  var len4 = val4.length;
  var ptr4 = realloc1(0, 0, 4, len4 * 4);
  var src4 = new Uint8Array(val4.buffer, val4.byteOffset, len4 * 4);
  (new Uint8Array(memory1.buffer, ptr4, len4 * 4)).set(src4);
  dataView(memory1).setUint32(arg2 + 4, len4, true);
  dataView(memory1).setUint32(arg2 + 0, ptr4, true);
  _debugLog('[iface="wasi:io/poll@0.2.0", function="poll"][Instruction::Return]', {
    funcName: 'poll',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline109(arg0, arg1) {
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-bytes"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-random-bytes');
  const ret = getRandomBytes(BigInt.asUintN(64, arg0));
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-bytes"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var val0 = ret;
  var len0 = val0.byteLength;
  var ptr0 = realloc1(0, 0, 1, len0 * 1);
  var src0 = new Uint8Array(val0.buffer || val0, val0.byteOffset, len0 * 1);
  (new Uint8Array(memory1.buffer, ptr0, len0 * 1)).set(src0);
  dataView(memory1).setUint32(arg1 + 4, len0, true);
  dataView(memory1).setUint32(arg1 + 0, ptr0, true);
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-bytes"][Instruction::Return]', {
    funcName: 'get-random-bytes',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline110(arg0) {
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-environment"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-environment');
  const ret = getEnvironment();
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-environment"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var vec3 = ret;
  var len3 = vec3.length;
  var result3 = realloc1(0, 0, 4, len3 * 16);
  for (let i = 0; i < vec3.length; i++) {
    const e = vec3[i];
    const base = result3 + i * 16;var [tuple0_0, tuple0_1] = e;
    var ptr1 = utf8Encode(tuple0_0, realloc1, memory1);
    var len1 = utf8EncodedLen;
    dataView(memory1).setUint32(base + 4, len1, true);
    dataView(memory1).setUint32(base + 0, ptr1, true);
    var ptr2 = utf8Encode(tuple0_1, realloc1, memory1);
    var len2 = utf8EncodedLen;
    dataView(memory1).setUint32(base + 12, len2, true);
    dataView(memory1).setUint32(base + 8, ptr2, true);
  }
  dataView(memory1).setUint32(arg0 + 4, len3, true);
  dataView(memory1).setUint32(arg0 + 0, result3, true);
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-environment"][Instruction::Return]', {
    funcName: 'get-environment',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline111(arg0) {
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-arguments"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-arguments');
  const ret = getArguments();
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-arguments"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var vec1 = ret;
  var len1 = vec1.length;
  var result1 = realloc1(0, 0, 4, len1 * 8);
  for (let i = 0; i < vec1.length; i++) {
    const e = vec1[i];
    const base = result1 + i * 8;var ptr0 = utf8Encode(e, realloc1, memory1);
    var len0 = utf8EncodedLen;
    dataView(memory1).setUint32(base + 4, len0, true);
    dataView(memory1).setUint32(base + 0, ptr0, true);
  }
  dataView(memory1).setUint32(arg0 + 4, len1, true);
  dataView(memory1).setUint32(arg0 + 0, result1, true);
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-arguments"][Instruction::Return]', {
    funcName: 'get-arguments',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}

const handleTable26 = [T_FLAG, 0];
const captureTable6= new Map();
let captureCnt6 = 0;
handleTables[26] = handleTable26;

function trampoline112(arg0) {
  _debugLog('[iface="wasi:cli/terminal-stdin@0.2.0", function="get-terminal-stdin"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-terminal-stdin');
  const ret = getTerminalStdin();
  _debugLog('[iface="wasi:cli/terminal-stdin@0.2.0", function="get-terminal-stdin"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var variant1 = ret;
  if (variant1 === null || variant1=== undefined) {
    dataView(memory1).setInt8(arg0 + 0, 0, true);
  } else {
    const e = variant1;
    dataView(memory1).setInt8(arg0 + 0, 1, true);
    if (!(e instanceof TerminalInput)) {
      throw new TypeError('Resource error: Not a valid "TerminalInput" resource.');
    }
    var handle0 = e[symbolRscHandle];
    if (!handle0) {
      const rep = e[symbolRscRep] || ++captureCnt6;
      captureTable6.set(rep, e);
      handle0 = rscTableCreateOwn(handleTable26, rep);
    }
    dataView(memory1).setInt32(arg0 + 4, handle0, true);
  }
  _debugLog('[iface="wasi:cli/terminal-stdin@0.2.0", function="get-terminal-stdin"][Instruction::Return]', {
    funcName: 'get-terminal-stdin',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}

const handleTable25 = [T_FLAG, 0];
const captureTable7= new Map();
let captureCnt7 = 0;
handleTables[25] = handleTable25;

function trampoline113(arg0) {
  _debugLog('[iface="wasi:cli/terminal-stdout@0.2.0", function="get-terminal-stdout"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-terminal-stdout');
  const ret = getTerminalStdout();
  _debugLog('[iface="wasi:cli/terminal-stdout@0.2.0", function="get-terminal-stdout"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var variant1 = ret;
  if (variant1 === null || variant1=== undefined) {
    dataView(memory1).setInt8(arg0 + 0, 0, true);
  } else {
    const e = variant1;
    dataView(memory1).setInt8(arg0 + 0, 1, true);
    if (!(e instanceof TerminalOutput)) {
      throw new TypeError('Resource error: Not a valid "TerminalOutput" resource.');
    }
    var handle0 = e[symbolRscHandle];
    if (!handle0) {
      const rep = e[symbolRscRep] || ++captureCnt7;
      captureTable7.set(rep, e);
      handle0 = rscTableCreateOwn(handleTable25, rep);
    }
    dataView(memory1).setInt32(arg0 + 4, handle0, true);
  }
  _debugLog('[iface="wasi:cli/terminal-stdout@0.2.0", function="get-terminal-stdout"][Instruction::Return]', {
    funcName: 'get-terminal-stdout',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline114(arg0) {
  _debugLog('[iface="wasi:cli/terminal-stderr@0.2.0", function="get-terminal-stderr"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-terminal-stderr');
  const ret = getTerminalStderr();
  _debugLog('[iface="wasi:cli/terminal-stderr@0.2.0", function="get-terminal-stderr"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var variant1 = ret;
  if (variant1 === null || variant1=== undefined) {
    dataView(memory1).setInt8(arg0 + 0, 0, true);
  } else {
    const e = variant1;
    dataView(memory1).setInt8(arg0 + 0, 1, true);
    if (!(e instanceof TerminalOutput)) {
      throw new TypeError('Resource error: Not a valid "TerminalOutput" resource.');
    }
    var handle0 = e[symbolRscHandle];
    if (!handle0) {
      const rep = e[symbolRscRep] || ++captureCnt7;
      captureTable7.set(rep, e);
      handle0 = rscTableCreateOwn(handleTable25, rep);
    }
    dataView(memory1).setInt32(arg0 + 4, handle0, true);
  }
  _debugLog('[iface="wasi:cli/terminal-stderr@0.2.0", function="get-terminal-stderr"][Instruction::Return]', {
    funcName: 'get-terminal-stderr',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline115(arg0) {
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-arguments"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-arguments');
  const ret = getArguments();
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-arguments"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var vec1 = ret;
  var len1 = vec1.length;
  var result1 = realloc2(0, 0, 4, len1 * 8);
  for (let i = 0; i < vec1.length; i++) {
    const e = vec1[i];
    const base = result1 + i * 8;var ptr0 = utf8Encode(e, realloc2, memory1);
    var len0 = utf8EncodedLen;
    dataView(memory1).setUint32(base + 4, len0, true);
    dataView(memory1).setUint32(base + 0, ptr0, true);
  }
  dataView(memory1).setUint32(arg0 + 4, len1, true);
  dataView(memory1).setUint32(arg0 + 0, result1, true);
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-arguments"][Instruction::Return]', {
    funcName: 'get-arguments',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline116(arg0) {
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-environment"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-environment');
  const ret = getEnvironment();
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-environment"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var vec3 = ret;
  var len3 = vec3.length;
  var result3 = realloc2(0, 0, 4, len3 * 16);
  for (let i = 0; i < vec3.length; i++) {
    const e = vec3[i];
    const base = result3 + i * 16;var [tuple0_0, tuple0_1] = e;
    var ptr1 = utf8Encode(tuple0_0, realloc2, memory1);
    var len1 = utf8EncodedLen;
    dataView(memory1).setUint32(base + 4, len1, true);
    dataView(memory1).setUint32(base + 0, ptr1, true);
    var ptr2 = utf8Encode(tuple0_1, realloc2, memory1);
    var len2 = utf8EncodedLen;
    dataView(memory1).setUint32(base + 12, len2, true);
    dataView(memory1).setUint32(base + 8, ptr2, true);
  }
  dataView(memory1).setUint32(arg0 + 4, len3, true);
  dataView(memory1).setUint32(arg0 + 0, result3, true);
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-environment"][Instruction::Return]', {
    funcName: 'get-environment',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline117(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable22[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable0.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Error$1.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/error@0.2.0", function="[method]error.to-debug-string"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]error.to-debug-string');
  const ret = rsc0.toDebugString();
  _debugLog('[iface="wasi:io/error@0.2.0", function="[method]error.to-debug-string"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var ptr3 = utf8Encode(ret, realloc3, memory1);
  var len3 = utf8EncodedLen;
  dataView(memory1).setUint32(arg1 + 4, len3, true);
  dataView(memory1).setUint32(arg1 + 0, ptr3, true);
  _debugLog('[iface="wasi:io/error@0.2.0", function="[method]error.to-debug-string"][Instruction::Return]', {
    funcName: '[method]error.to-debug-string',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline118(arg0, arg1, arg2) {
  var len3 = arg1;
  var base3 = arg0;
  var result3 = [];
  for (let i = 0; i < len3; i++) {
    const base = base3 + i * 4;
    var handle1 = dataView(memory1).getInt32(base + 0, true);
    var rep2 = handleTable19[(handle1 << 1) + 1] & ~T_FLAG;
    var rsc0 = captureTable1.get(rep2);
    if (!rsc0) {
      rsc0 = Object.create(Pollable.prototype);
      Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
      Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
    }
    curResourceBorrows.push(rsc0);
    result3.push(rsc0);
  }
  _debugLog('[iface="wasi:io/poll@0.2.0", function="poll"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'poll');
  const ret = poll(result3);
  _debugLog('[iface="wasi:io/poll@0.2.0", function="poll"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var val4 = ret;
  var len4 = val4.length;
  var ptr4 = realloc3(0, 0, 4, len4 * 4);
  var src4 = new Uint8Array(val4.buffer, val4.byteOffset, len4 * 4);
  (new Uint8Array(memory1.buffer, ptr4, len4 * 4)).set(src4);
  dataView(memory1).setUint32(arg2 + 4, len4, true);
  dataView(memory1).setUint32(arg2 + 0, ptr4, true);
  _debugLog('[iface="wasi:io/poll@0.2.0", function="poll"][Instruction::Return]', {
    funcName: 'poll',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline119(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable23[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable2.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(InputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.read"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]input-stream.read');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.read(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.read"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      var val3 = e;
      var len3 = val3.byteLength;
      var ptr3 = realloc3(0, 0, 1, len3 * 1);
      var src3 = new Uint8Array(val3.buffer || val3, val3.byteOffset, len3 * 1);
      (new Uint8Array(memory1.buffer, ptr3, len3 * 1)).set(src3);
      dataView(memory1).setUint32(arg2 + 8, len3, true);
      dataView(memory1).setUint32(arg2 + 4, ptr3, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var variant5 = e;
      switch (variant5.tag) {
        case 'last-operation-failed': {
          const e = variant5.val;
          dataView(memory1).setInt8(arg2 + 4, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle4 = e[symbolRscHandle];
          if (!handle4) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle4 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg2 + 8, handle4, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg2 + 4, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.read"][Instruction::Return]', {
    funcName: '[method]input-stream.read',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline120(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable23[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable2.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(InputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.blocking-read"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]input-stream.blocking-read');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.blockingRead(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.blocking-read"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      var val3 = e;
      var len3 = val3.byteLength;
      var ptr3 = realloc3(0, 0, 1, len3 * 1);
      var src3 = new Uint8Array(val3.buffer || val3, val3.byteOffset, len3 * 1);
      (new Uint8Array(memory1.buffer, ptr3, len3 * 1)).set(src3);
      dataView(memory1).setUint32(arg2 + 8, len3, true);
      dataView(memory1).setUint32(arg2 + 4, ptr3, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var variant5 = e;
      switch (variant5.tag) {
        case 'last-operation-failed': {
          const e = variant5.val;
          dataView(memory1).setInt8(arg2 + 4, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle4 = e[symbolRscHandle];
          if (!handle4) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle4 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg2 + 8, handle4, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg2 + 4, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.blocking-read"][Instruction::Return]', {
    funcName: '[method]input-stream.blocking-read',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline121(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable23[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable2.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(InputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.skip"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]input-stream.skip');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.skip(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.skip"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      dataView(memory1).setBigInt64(arg2 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var variant4 = e;
      switch (variant4.tag) {
        case 'last-operation-failed': {
          const e = variant4.val;
          dataView(memory1).setInt8(arg2 + 8, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle3 = e[symbolRscHandle];
          if (!handle3) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle3 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg2 + 12, handle3, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg2 + 8, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant4.tag)}\` (received \`${variant4}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.skip"][Instruction::Return]', {
    funcName: '[method]input-stream.skip',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline122(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable23[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable2.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(InputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.blocking-skip"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]input-stream.blocking-skip');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.blockingSkip(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.blocking-skip"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      dataView(memory1).setBigInt64(arg2 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var variant4 = e;
      switch (variant4.tag) {
        case 'last-operation-failed': {
          const e = variant4.val;
          dataView(memory1).setInt8(arg2 + 8, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle3 = e[symbolRscHandle];
          if (!handle3) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle3 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg2 + 12, handle3, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg2 + 8, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant4.tag)}\` (received \`${variant4}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]input-stream.blocking-skip"][Instruction::Return]', {
    funcName: '[method]input-stream.blocking-skip',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline123(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable24[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable3.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.flush"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]output-stream.flush');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.flush()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.flush"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var variant4 = e;
      switch (variant4.tag) {
        case 'last-operation-failed': {
          const e = variant4.val;
          dataView(memory1).setInt8(arg1 + 4, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle3 = e[symbolRscHandle];
          if (!handle3) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle3 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg1 + 8, handle3, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg1 + 4, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant4.tag)}\` (received \`${variant4}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.flush"][Instruction::Return]', {
    funcName: '[method]output-stream.flush',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline124(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable24[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable3.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.write-zeroes"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]output-stream.write-zeroes');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.writeZeroes(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.write-zeroes"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var variant4 = e;
      switch (variant4.tag) {
        case 'last-operation-failed': {
          const e = variant4.val;
          dataView(memory1).setInt8(arg2 + 4, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle3 = e[symbolRscHandle];
          if (!handle3) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle3 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg2 + 8, handle3, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg2 + 4, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant4.tag)}\` (received \`${variant4}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.write-zeroes"][Instruction::Return]', {
    funcName: '[method]output-stream.write-zeroes',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline125(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable24[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable3.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-write-zeroes-and-flush"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]output-stream.blocking-write-zeroes-and-flush');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.blockingWriteZeroesAndFlush(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-write-zeroes-and-flush"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var variant4 = e;
      switch (variant4.tag) {
        case 'last-operation-failed': {
          const e = variant4.val;
          dataView(memory1).setInt8(arg2 + 4, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle3 = e[symbolRscHandle];
          if (!handle3) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle3 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg2 + 8, handle3, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg2 + 4, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant4.tag)}\` (received \`${variant4}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-write-zeroes-and-flush"][Instruction::Return]', {
    funcName: '[method]output-stream.blocking-write-zeroes-and-flush',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline126(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable24[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable3.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var handle4 = arg1;
  var rep5 = handleTable23[(handle4 << 1) + 1] & ~T_FLAG;
  var rsc3 = captureTable2.get(rep5);
  if (!rsc3) {
    rsc3 = Object.create(InputStream.prototype);
    Object.defineProperty(rsc3, symbolRscHandle, { writable: true, value: handle4});
    Object.defineProperty(rsc3, symbolRscRep, { writable: true, value: rep5});
  }
  curResourceBorrows.push(rsc3);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.splice"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]output-stream.splice');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.splice(rsc3, BigInt.asUintN(64, arg2))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.splice"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant8 = ret;
  switch (variant8.tag) {
    case 'ok': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg3 + 0, 0, true);
      dataView(memory1).setBigInt64(arg3 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg3 + 0, 1, true);
      var variant7 = e;
      switch (variant7.tag) {
        case 'last-operation-failed': {
          const e = variant7.val;
          dataView(memory1).setInt8(arg3 + 8, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle6 = e[symbolRscHandle];
          if (!handle6) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle6 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg3 + 12, handle6, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg3 + 8, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant7.tag)}\` (received \`${variant7}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.splice"][Instruction::Return]', {
    funcName: '[method]output-stream.splice',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline127(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable24[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable3.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var handle4 = arg1;
  var rep5 = handleTable23[(handle4 << 1) + 1] & ~T_FLAG;
  var rsc3 = captureTable2.get(rep5);
  if (!rsc3) {
    rsc3 = Object.create(InputStream.prototype);
    Object.defineProperty(rsc3, symbolRscHandle, { writable: true, value: handle4});
    Object.defineProperty(rsc3, symbolRscRep, { writable: true, value: rep5});
  }
  curResourceBorrows.push(rsc3);
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-splice"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]output-stream.blocking-splice');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.blockingSplice(rsc3, BigInt.asUintN(64, arg2))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-splice"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant8 = ret;
  switch (variant8.tag) {
    case 'ok': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg3 + 0, 0, true);
      dataView(memory1).setBigInt64(arg3 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg3 + 0, 1, true);
      var variant7 = e;
      switch (variant7.tag) {
        case 'last-operation-failed': {
          const e = variant7.val;
          dataView(memory1).setInt8(arg3 + 8, 0, true);
          if (!(e instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid "Error" resource.');
          }
          var handle6 = e[symbolRscHandle];
          if (!handle6) {
            const rep = e[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, e);
            handle6 = rscTableCreateOwn(handleTable22, rep);
          }
          dataView(memory1).setInt32(arg3 + 12, handle6, true);
          break;
        }
        case 'closed': {
          dataView(memory1).setInt8(arg3 + 8, 1, true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant7.tag)}\` (received \`${variant7}\`) specified for \`StreamError\``);
        }
      }
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:io/streams@0.2.0", function="[method]output-stream.blocking-splice"][Instruction::Return]', {
    funcName: '[method]output-stream.blocking-splice',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline128(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.read');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.read(BigInt.asUintN(64, arg1), BigInt.asUintN(64, arg2))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg3 + 0, 0, true);
      var [tuple3_0, tuple3_1] = e;
      var val4 = tuple3_0;
      var len4 = val4.byteLength;
      var ptr4 = realloc3(0, 0, 1, len4 * 1);
      var src4 = new Uint8Array(val4.buffer || val4, val4.byteOffset, len4 * 1);
      (new Uint8Array(memory1.buffer, ptr4, len4 * 1)).set(src4);
      dataView(memory1).setUint32(arg3 + 8, len4, true);
      dataView(memory1).setUint32(arg3 + 4, ptr4, true);
      dataView(memory1).setInt8(arg3 + 12, tuple3_1 ? 1 : 0, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg3 + 0, 1, true);
      var val5 = e;
      let enum5;
      switch (val5) {
        case 'access': {
          enum5 = 0;
          break;
        }
        case 'would-block': {
          enum5 = 1;
          break;
        }
        case 'already': {
          enum5 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum5 = 3;
          break;
        }
        case 'busy': {
          enum5 = 4;
          break;
        }
        case 'deadlock': {
          enum5 = 5;
          break;
        }
        case 'quota': {
          enum5 = 6;
          break;
        }
        case 'exist': {
          enum5 = 7;
          break;
        }
        case 'file-too-large': {
          enum5 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum5 = 9;
          break;
        }
        case 'in-progress': {
          enum5 = 10;
          break;
        }
        case 'interrupted': {
          enum5 = 11;
          break;
        }
        case 'invalid': {
          enum5 = 12;
          break;
        }
        case 'io': {
          enum5 = 13;
          break;
        }
        case 'is-directory': {
          enum5 = 14;
          break;
        }
        case 'loop': {
          enum5 = 15;
          break;
        }
        case 'too-many-links': {
          enum5 = 16;
          break;
        }
        case 'message-size': {
          enum5 = 17;
          break;
        }
        case 'name-too-long': {
          enum5 = 18;
          break;
        }
        case 'no-device': {
          enum5 = 19;
          break;
        }
        case 'no-entry': {
          enum5 = 20;
          break;
        }
        case 'no-lock': {
          enum5 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum5 = 22;
          break;
        }
        case 'insufficient-space': {
          enum5 = 23;
          break;
        }
        case 'not-directory': {
          enum5 = 24;
          break;
        }
        case 'not-empty': {
          enum5 = 25;
          break;
        }
        case 'not-recoverable': {
          enum5 = 26;
          break;
        }
        case 'unsupported': {
          enum5 = 27;
          break;
        }
        case 'no-tty': {
          enum5 = 28;
          break;
        }
        case 'no-such-device': {
          enum5 = 29;
          break;
        }
        case 'overflow': {
          enum5 = 30;
          break;
        }
        case 'not-permitted': {
          enum5 = 31;
          break;
        }
        case 'pipe': {
          enum5 = 32;
          break;
        }
        case 'read-only': {
          enum5 = 33;
          break;
        }
        case 'invalid-seek': {
          enum5 = 34;
          break;
        }
        case 'text-file-busy': {
          enum5 = 35;
          break;
        }
        case 'cross-device': {
          enum5 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val5}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg3 + 4, enum5, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.read"][Instruction::Return]', {
    funcName: '[method]descriptor.read',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline129(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable21[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable4.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Descriptor.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr3, len3));
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.readlink-at"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]descriptor.readlink-at');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.readlinkAt(result3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.readlink-at"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg3 + 0, 0, true);
      var ptr4 = utf8Encode(e, realloc3, memory1);
      var len4 = utf8EncodedLen;
      dataView(memory1).setUint32(arg3 + 8, len4, true);
      dataView(memory1).setUint32(arg3 + 4, ptr4, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg3 + 0, 1, true);
      var val5 = e;
      let enum5;
      switch (val5) {
        case 'access': {
          enum5 = 0;
          break;
        }
        case 'would-block': {
          enum5 = 1;
          break;
        }
        case 'already': {
          enum5 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum5 = 3;
          break;
        }
        case 'busy': {
          enum5 = 4;
          break;
        }
        case 'deadlock': {
          enum5 = 5;
          break;
        }
        case 'quota': {
          enum5 = 6;
          break;
        }
        case 'exist': {
          enum5 = 7;
          break;
        }
        case 'file-too-large': {
          enum5 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum5 = 9;
          break;
        }
        case 'in-progress': {
          enum5 = 10;
          break;
        }
        case 'interrupted': {
          enum5 = 11;
          break;
        }
        case 'invalid': {
          enum5 = 12;
          break;
        }
        case 'io': {
          enum5 = 13;
          break;
        }
        case 'is-directory': {
          enum5 = 14;
          break;
        }
        case 'loop': {
          enum5 = 15;
          break;
        }
        case 'too-many-links': {
          enum5 = 16;
          break;
        }
        case 'message-size': {
          enum5 = 17;
          break;
        }
        case 'name-too-long': {
          enum5 = 18;
          break;
        }
        case 'no-device': {
          enum5 = 19;
          break;
        }
        case 'no-entry': {
          enum5 = 20;
          break;
        }
        case 'no-lock': {
          enum5 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum5 = 22;
          break;
        }
        case 'insufficient-space': {
          enum5 = 23;
          break;
        }
        case 'not-directory': {
          enum5 = 24;
          break;
        }
        case 'not-empty': {
          enum5 = 25;
          break;
        }
        case 'not-recoverable': {
          enum5 = 26;
          break;
        }
        case 'unsupported': {
          enum5 = 27;
          break;
        }
        case 'no-tty': {
          enum5 = 28;
          break;
        }
        case 'no-such-device': {
          enum5 = 29;
          break;
        }
        case 'overflow': {
          enum5 = 30;
          break;
        }
        case 'not-permitted': {
          enum5 = 31;
          break;
        }
        case 'pipe': {
          enum5 = 32;
          break;
        }
        case 'read-only': {
          enum5 = 33;
          break;
        }
        case 'invalid-seek': {
          enum5 = 34;
          break;
        }
        case 'text-file-busy': {
          enum5 = 35;
          break;
        }
        case 'cross-device': {
          enum5 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val5}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg3 + 4, enum5, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]descriptor.readlink-at"][Instruction::Return]', {
    funcName: '[method]descriptor.readlink-at',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline130(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable20[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable5.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(DirectoryEntryStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]directory-entry-stream.read-directory-entry"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]directory-entry-stream.read-directory-entry');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.readDirectoryEntry()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]directory-entry-stream.read-directory-entry"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant8 = ret;
  switch (variant8.tag) {
    case 'ok': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      var variant6 = e;
      if (variant6 === null || variant6=== undefined) {
        dataView(memory1).setInt8(arg1 + 4, 0, true);
      } else {
        const e = variant6;
        dataView(memory1).setInt8(arg1 + 4, 1, true);
        var {type: v3_0, name: v3_1 } = e;
        var val4 = v3_0;
        let enum4;
        switch (val4) {
          case 'unknown': {
            enum4 = 0;
            break;
          }
          case 'block-device': {
            enum4 = 1;
            break;
          }
          case 'character-device': {
            enum4 = 2;
            break;
          }
          case 'directory': {
            enum4 = 3;
            break;
          }
          case 'fifo': {
            enum4 = 4;
            break;
          }
          case 'symbolic-link': {
            enum4 = 5;
            break;
          }
          case 'regular-file': {
            enum4 = 6;
            break;
          }
          case 'socket': {
            enum4 = 7;
            break;
          }
          default: {
            if ((v3_0) instanceof Error) {
              console.error(v3_0);
            }
            
            throw new TypeError(`"${val4}" is not one of the cases of descriptor-type`);
          }
        }
        dataView(memory1).setInt8(arg1 + 8, enum4, true);
        var ptr5 = utf8Encode(v3_1, realloc3, memory1);
        var len5 = utf8EncodedLen;
        dataView(memory1).setUint32(arg1 + 16, len5, true);
        dataView(memory1).setUint32(arg1 + 12, ptr5, true);
      }
      break;
    }
    case 'err': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val7 = e;
      let enum7;
      switch (val7) {
        case 'access': {
          enum7 = 0;
          break;
        }
        case 'would-block': {
          enum7 = 1;
          break;
        }
        case 'already': {
          enum7 = 2;
          break;
        }
        case 'bad-descriptor': {
          enum7 = 3;
          break;
        }
        case 'busy': {
          enum7 = 4;
          break;
        }
        case 'deadlock': {
          enum7 = 5;
          break;
        }
        case 'quota': {
          enum7 = 6;
          break;
        }
        case 'exist': {
          enum7 = 7;
          break;
        }
        case 'file-too-large': {
          enum7 = 8;
          break;
        }
        case 'illegal-byte-sequence': {
          enum7 = 9;
          break;
        }
        case 'in-progress': {
          enum7 = 10;
          break;
        }
        case 'interrupted': {
          enum7 = 11;
          break;
        }
        case 'invalid': {
          enum7 = 12;
          break;
        }
        case 'io': {
          enum7 = 13;
          break;
        }
        case 'is-directory': {
          enum7 = 14;
          break;
        }
        case 'loop': {
          enum7 = 15;
          break;
        }
        case 'too-many-links': {
          enum7 = 16;
          break;
        }
        case 'message-size': {
          enum7 = 17;
          break;
        }
        case 'name-too-long': {
          enum7 = 18;
          break;
        }
        case 'no-device': {
          enum7 = 19;
          break;
        }
        case 'no-entry': {
          enum7 = 20;
          break;
        }
        case 'no-lock': {
          enum7 = 21;
          break;
        }
        case 'insufficient-memory': {
          enum7 = 22;
          break;
        }
        case 'insufficient-space': {
          enum7 = 23;
          break;
        }
        case 'not-directory': {
          enum7 = 24;
          break;
        }
        case 'not-empty': {
          enum7 = 25;
          break;
        }
        case 'not-recoverable': {
          enum7 = 26;
          break;
        }
        case 'unsupported': {
          enum7 = 27;
          break;
        }
        case 'no-tty': {
          enum7 = 28;
          break;
        }
        case 'no-such-device': {
          enum7 = 29;
          break;
        }
        case 'overflow': {
          enum7 = 30;
          break;
        }
        case 'not-permitted': {
          enum7 = 31;
          break;
        }
        case 'pipe': {
          enum7 = 32;
          break;
        }
        case 'read-only': {
          enum7 = 33;
          break;
        }
        case 'invalid-seek': {
          enum7 = 34;
          break;
        }
        case 'text-file-busy': {
          enum7 = 35;
          break;
        }
        case 'cross-device': {
          enum7 = 36;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val7}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 4, enum7, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:filesystem/types@0.2.0", function="[method]directory-entry-stream.read-directory-entry"][Instruction::Return]', {
    funcName: '[method]directory-entry-stream.read-directory-entry',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline131(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14) {
  var handle1 = arg0;
  var rep2 = handleTable28[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable9.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(UdpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var handle4 = arg1;
  var rep5 = handleTable27[(handle4 << 1) + 1] & ~T_FLAG;
  var rsc3 = captureTable8.get(rep5);
  if (!rsc3) {
    rsc3 = Object.create(Network.prototype);
    Object.defineProperty(rsc3, symbolRscHandle, { writable: true, value: handle4});
    Object.defineProperty(rsc3, symbolRscRep, { writable: true, value: rep5});
  }
  curResourceBorrows.push(rsc3);
  let variant6;
  switch (arg2) {
    case 0: {
      variant6= {
        tag: 'ipv4',
        val: {
          port: clampGuest(arg3, 0, 65535),
          address: [clampGuest(arg4, 0, 255), clampGuest(arg5, 0, 255), clampGuest(arg6, 0, 255), clampGuest(arg7, 0, 255)],
        }
      };
      break;
    }
    case 1: {
      variant6= {
        tag: 'ipv6',
        val: {
          port: clampGuest(arg3, 0, 65535),
          flowInfo: arg4 >>> 0,
          address: [clampGuest(arg5, 0, 65535), clampGuest(arg6, 0, 65535), clampGuest(arg7, 0, 65535), clampGuest(arg8, 0, 65535), clampGuest(arg9, 0, 65535), clampGuest(arg10, 0, 65535), clampGuest(arg11, 0, 65535), clampGuest(arg12, 0, 65535)],
          scopeId: arg13 >>> 0,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for IpSocketAddress');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.start-bind"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]udp-socket.start-bind');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.startBind(rsc3, variant6)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.start-bind"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant8 = ret;
  switch (variant8.tag) {
    case 'ok': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg14 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg14 + 0, 1, true);
      var val7 = e;
      let enum7;
      switch (val7) {
        case 'unknown': {
          enum7 = 0;
          break;
        }
        case 'access-denied': {
          enum7 = 1;
          break;
        }
        case 'not-supported': {
          enum7 = 2;
          break;
        }
        case 'invalid-argument': {
          enum7 = 3;
          break;
        }
        case 'out-of-memory': {
          enum7 = 4;
          break;
        }
        case 'timeout': {
          enum7 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum7 = 6;
          break;
        }
        case 'not-in-progress': {
          enum7 = 7;
          break;
        }
        case 'would-block': {
          enum7 = 8;
          break;
        }
        case 'invalid-state': {
          enum7 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum7 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum7 = 11;
          break;
        }
        case 'address-in-use': {
          enum7 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum7 = 13;
          break;
        }
        case 'connection-refused': {
          enum7 = 14;
          break;
        }
        case 'connection-reset': {
          enum7 = 15;
          break;
        }
        case 'connection-aborted': {
          enum7 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum7 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum7 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum7 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum7 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val7}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg14 + 1, enum7, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.start-bind"][Instruction::Return]', {
    funcName: '[method]udp-socket.start-bind',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline132(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable28[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable9.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(UdpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.finish-bind"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]udp-socket.finish-bind');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.finishBind()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.finish-bind"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.finish-bind"][Instruction::Return]', {
    funcName: '[method]udp-socket.finish-bind',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline133(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14) {
  var handle1 = arg0;
  var rep2 = handleTable28[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable9.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(UdpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  let variant4;
  switch (arg1) {
    case 0: {
      variant4 = undefined;
      break;
    }
    case 1: {
      let variant3;
      switch (arg2) {
        case 0: {
          variant3= {
            tag: 'ipv4',
            val: {
              port: clampGuest(arg3, 0, 65535),
              address: [clampGuest(arg4, 0, 255), clampGuest(arg5, 0, 255), clampGuest(arg6, 0, 255), clampGuest(arg7, 0, 255)],
            }
          };
          break;
        }
        case 1: {
          variant3= {
            tag: 'ipv6',
            val: {
              port: clampGuest(arg3, 0, 65535),
              flowInfo: arg4 >>> 0,
              address: [clampGuest(arg5, 0, 65535), clampGuest(arg6, 0, 65535), clampGuest(arg7, 0, 65535), clampGuest(arg8, 0, 65535), clampGuest(arg9, 0, 65535), clampGuest(arg10, 0, 65535), clampGuest(arg11, 0, 65535), clampGuest(arg12, 0, 65535)],
              scopeId: arg13 >>> 0,
            }
          };
          break;
        }
        default: {
          throw new TypeError('invalid variant discriminant for IpSocketAddress');
        }
      }
      variant4 = variant3;
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for option');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.stream"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]udp-socket.stream');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.stream(variant4)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.stream"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant9 = ret;
  switch (variant9.tag) {
    case 'ok': {
      const e = variant9.val;
      dataView(memory1).setInt8(arg14 + 0, 0, true);
      var [tuple5_0, tuple5_1] = e;
      if (!(tuple5_0 instanceof IncomingDatagramStream)) {
        throw new TypeError('Resource error: Not a valid "IncomingDatagramStream" resource.');
      }
      var handle6 = tuple5_0[symbolRscHandle];
      if (!handle6) {
        const rep = tuple5_0[symbolRscRep] || ++captureCnt10;
        captureTable10.set(rep, tuple5_0);
        handle6 = rscTableCreateOwn(handleTable29, rep);
      }
      dataView(memory1).setInt32(arg14 + 4, handle6, true);
      if (!(tuple5_1 instanceof OutgoingDatagramStream)) {
        throw new TypeError('Resource error: Not a valid "OutgoingDatagramStream" resource.');
      }
      var handle7 = tuple5_1[symbolRscHandle];
      if (!handle7) {
        const rep = tuple5_1[symbolRscRep] || ++captureCnt11;
        captureTable11.set(rep, tuple5_1);
        handle7 = rscTableCreateOwn(handleTable30, rep);
      }
      dataView(memory1).setInt32(arg14 + 8, handle7, true);
      break;
    }
    case 'err': {
      const e = variant9.val;
      dataView(memory1).setInt8(arg14 + 0, 1, true);
      var val8 = e;
      let enum8;
      switch (val8) {
        case 'unknown': {
          enum8 = 0;
          break;
        }
        case 'access-denied': {
          enum8 = 1;
          break;
        }
        case 'not-supported': {
          enum8 = 2;
          break;
        }
        case 'invalid-argument': {
          enum8 = 3;
          break;
        }
        case 'out-of-memory': {
          enum8 = 4;
          break;
        }
        case 'timeout': {
          enum8 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum8 = 6;
          break;
        }
        case 'not-in-progress': {
          enum8 = 7;
          break;
        }
        case 'would-block': {
          enum8 = 8;
          break;
        }
        case 'invalid-state': {
          enum8 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum8 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum8 = 11;
          break;
        }
        case 'address-in-use': {
          enum8 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum8 = 13;
          break;
        }
        case 'connection-refused': {
          enum8 = 14;
          break;
        }
        case 'connection-reset': {
          enum8 = 15;
          break;
        }
        case 'connection-aborted': {
          enum8 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum8 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum8 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum8 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum8 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val8}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg14 + 4, enum8, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.stream"][Instruction::Return]', {
    funcName: '[method]udp-socket.stream',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline134(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable28[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable9.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(UdpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.local-address"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]udp-socket.local-address');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.localAddress()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.local-address"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant9 = ret;
  switch (variant9.tag) {
    case 'ok': {
      const e = variant9.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      var variant7 = e;
      switch (variant7.tag) {
        case 'ipv4': {
          const e = variant7.val;
          dataView(memory1).setInt8(arg1 + 4, 0, true);
          var {port: v3_0, address: v3_1 } = e;
          dataView(memory1).setInt16(arg1 + 8, toUint16(v3_0), true);
          var [tuple4_0, tuple4_1, tuple4_2, tuple4_3] = v3_1;
          dataView(memory1).setInt8(arg1 + 10, toUint8(tuple4_0), true);
          dataView(memory1).setInt8(arg1 + 11, toUint8(tuple4_1), true);
          dataView(memory1).setInt8(arg1 + 12, toUint8(tuple4_2), true);
          dataView(memory1).setInt8(arg1 + 13, toUint8(tuple4_3), true);
          break;
        }
        case 'ipv6': {
          const e = variant7.val;
          dataView(memory1).setInt8(arg1 + 4, 1, true);
          var {port: v5_0, flowInfo: v5_1, address: v5_2, scopeId: v5_3 } = e;
          dataView(memory1).setInt16(arg1 + 8, toUint16(v5_0), true);
          dataView(memory1).setInt32(arg1 + 12, toUint32(v5_1), true);
          var [tuple6_0, tuple6_1, tuple6_2, tuple6_3, tuple6_4, tuple6_5, tuple6_6, tuple6_7] = v5_2;
          dataView(memory1).setInt16(arg1 + 16, toUint16(tuple6_0), true);
          dataView(memory1).setInt16(arg1 + 18, toUint16(tuple6_1), true);
          dataView(memory1).setInt16(arg1 + 20, toUint16(tuple6_2), true);
          dataView(memory1).setInt16(arg1 + 22, toUint16(tuple6_3), true);
          dataView(memory1).setInt16(arg1 + 24, toUint16(tuple6_4), true);
          dataView(memory1).setInt16(arg1 + 26, toUint16(tuple6_5), true);
          dataView(memory1).setInt16(arg1 + 28, toUint16(tuple6_6), true);
          dataView(memory1).setInt16(arg1 + 30, toUint16(tuple6_7), true);
          dataView(memory1).setInt32(arg1 + 32, toUint32(v5_3), true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant7.tag)}\` (received \`${variant7}\`) specified for \`IpSocketAddress\``);
        }
      }
      break;
    }
    case 'err': {
      const e = variant9.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val8 = e;
      let enum8;
      switch (val8) {
        case 'unknown': {
          enum8 = 0;
          break;
        }
        case 'access-denied': {
          enum8 = 1;
          break;
        }
        case 'not-supported': {
          enum8 = 2;
          break;
        }
        case 'invalid-argument': {
          enum8 = 3;
          break;
        }
        case 'out-of-memory': {
          enum8 = 4;
          break;
        }
        case 'timeout': {
          enum8 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum8 = 6;
          break;
        }
        case 'not-in-progress': {
          enum8 = 7;
          break;
        }
        case 'would-block': {
          enum8 = 8;
          break;
        }
        case 'invalid-state': {
          enum8 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum8 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum8 = 11;
          break;
        }
        case 'address-in-use': {
          enum8 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum8 = 13;
          break;
        }
        case 'connection-refused': {
          enum8 = 14;
          break;
        }
        case 'connection-reset': {
          enum8 = 15;
          break;
        }
        case 'connection-aborted': {
          enum8 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum8 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum8 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum8 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum8 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val8}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 4, enum8, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.local-address"][Instruction::Return]', {
    funcName: '[method]udp-socket.local-address',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline135(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable28[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable9.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(UdpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.remote-address"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]udp-socket.remote-address');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.remoteAddress()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.remote-address"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant9 = ret;
  switch (variant9.tag) {
    case 'ok': {
      const e = variant9.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      var variant7 = e;
      switch (variant7.tag) {
        case 'ipv4': {
          const e = variant7.val;
          dataView(memory1).setInt8(arg1 + 4, 0, true);
          var {port: v3_0, address: v3_1 } = e;
          dataView(memory1).setInt16(arg1 + 8, toUint16(v3_0), true);
          var [tuple4_0, tuple4_1, tuple4_2, tuple4_3] = v3_1;
          dataView(memory1).setInt8(arg1 + 10, toUint8(tuple4_0), true);
          dataView(memory1).setInt8(arg1 + 11, toUint8(tuple4_1), true);
          dataView(memory1).setInt8(arg1 + 12, toUint8(tuple4_2), true);
          dataView(memory1).setInt8(arg1 + 13, toUint8(tuple4_3), true);
          break;
        }
        case 'ipv6': {
          const e = variant7.val;
          dataView(memory1).setInt8(arg1 + 4, 1, true);
          var {port: v5_0, flowInfo: v5_1, address: v5_2, scopeId: v5_3 } = e;
          dataView(memory1).setInt16(arg1 + 8, toUint16(v5_0), true);
          dataView(memory1).setInt32(arg1 + 12, toUint32(v5_1), true);
          var [tuple6_0, tuple6_1, tuple6_2, tuple6_3, tuple6_4, tuple6_5, tuple6_6, tuple6_7] = v5_2;
          dataView(memory1).setInt16(arg1 + 16, toUint16(tuple6_0), true);
          dataView(memory1).setInt16(arg1 + 18, toUint16(tuple6_1), true);
          dataView(memory1).setInt16(arg1 + 20, toUint16(tuple6_2), true);
          dataView(memory1).setInt16(arg1 + 22, toUint16(tuple6_3), true);
          dataView(memory1).setInt16(arg1 + 24, toUint16(tuple6_4), true);
          dataView(memory1).setInt16(arg1 + 26, toUint16(tuple6_5), true);
          dataView(memory1).setInt16(arg1 + 28, toUint16(tuple6_6), true);
          dataView(memory1).setInt16(arg1 + 30, toUint16(tuple6_7), true);
          dataView(memory1).setInt32(arg1 + 32, toUint32(v5_3), true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant7.tag)}\` (received \`${variant7}\`) specified for \`IpSocketAddress\``);
        }
      }
      break;
    }
    case 'err': {
      const e = variant9.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val8 = e;
      let enum8;
      switch (val8) {
        case 'unknown': {
          enum8 = 0;
          break;
        }
        case 'access-denied': {
          enum8 = 1;
          break;
        }
        case 'not-supported': {
          enum8 = 2;
          break;
        }
        case 'invalid-argument': {
          enum8 = 3;
          break;
        }
        case 'out-of-memory': {
          enum8 = 4;
          break;
        }
        case 'timeout': {
          enum8 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum8 = 6;
          break;
        }
        case 'not-in-progress': {
          enum8 = 7;
          break;
        }
        case 'would-block': {
          enum8 = 8;
          break;
        }
        case 'invalid-state': {
          enum8 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum8 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum8 = 11;
          break;
        }
        case 'address-in-use': {
          enum8 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum8 = 13;
          break;
        }
        case 'connection-refused': {
          enum8 = 14;
          break;
        }
        case 'connection-reset': {
          enum8 = 15;
          break;
        }
        case 'connection-aborted': {
          enum8 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum8 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum8 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum8 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum8 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val8}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 4, enum8, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.remote-address"][Instruction::Return]', {
    funcName: '[method]udp-socket.remote-address',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline136(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable28[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable9.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(UdpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.unicast-hop-limit"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]udp-socket.unicast-hop-limit');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.unicastHopLimit()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.unicast-hop-limit"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      dataView(memory1).setInt8(arg1 + 1, toUint8(e), true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.unicast-hop-limit"][Instruction::Return]', {
    funcName: '[method]udp-socket.unicast-hop-limit',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline137(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable28[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable9.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(UdpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.set-unicast-hop-limit"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]udp-socket.set-unicast-hop-limit');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.setUnicastHopLimit(clampGuest(arg1, 0, 255))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.set-unicast-hop-limit"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.set-unicast-hop-limit"][Instruction::Return]', {
    funcName: '[method]udp-socket.set-unicast-hop-limit',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline138(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable28[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable9.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(UdpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.receive-buffer-size"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]udp-socket.receive-buffer-size');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.receiveBufferSize()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.receive-buffer-size"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      dataView(memory1).setBigInt64(arg1 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 8, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.receive-buffer-size"][Instruction::Return]', {
    funcName: '[method]udp-socket.receive-buffer-size',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline139(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable28[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable9.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(UdpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.set-receive-buffer-size"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]udp-socket.set-receive-buffer-size');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.setReceiveBufferSize(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.set-receive-buffer-size"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.set-receive-buffer-size"][Instruction::Return]', {
    funcName: '[method]udp-socket.set-receive-buffer-size',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline140(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable28[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable9.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(UdpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.send-buffer-size"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]udp-socket.send-buffer-size');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.sendBufferSize()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.send-buffer-size"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      dataView(memory1).setBigInt64(arg1 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 8, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.send-buffer-size"][Instruction::Return]', {
    funcName: '[method]udp-socket.send-buffer-size',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline141(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable28[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable9.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(UdpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.set-send-buffer-size"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]udp-socket.set-send-buffer-size');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.setSendBufferSize(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.set-send-buffer-size"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]udp-socket.set-send-buffer-size"][Instruction::Return]', {
    funcName: '[method]udp-socket.set-send-buffer-size',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline142(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable29[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable10.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(IncomingDatagramStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]incoming-datagram-stream.receive"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]incoming-datagram-stream.receive');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.receive(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]incoming-datagram-stream.receive"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant12 = ret;
  switch (variant12.tag) {
    case 'ok': {
      const e = variant12.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      var vec10 = e;
      var len10 = vec10.length;
      var result10 = realloc3(0, 0, 4, len10 * 40);
      for (let i = 0; i < vec10.length; i++) {
        const e = vec10[i];
        const base = result10 + i * 40;var {data: v3_0, remoteAddress: v3_1 } = e;
        var val4 = v3_0;
        var len4 = val4.byteLength;
        var ptr4 = realloc3(0, 0, 1, len4 * 1);
        var src4 = new Uint8Array(val4.buffer || val4, val4.byteOffset, len4 * 1);
        (new Uint8Array(memory1.buffer, ptr4, len4 * 1)).set(src4);
        dataView(memory1).setUint32(base + 4, len4, true);
        dataView(memory1).setUint32(base + 0, ptr4, true);
        var variant9 = v3_1;
        switch (variant9.tag) {
          case 'ipv4': {
            const e = variant9.val;
            dataView(memory1).setInt8(base + 8, 0, true);
            var {port: v5_0, address: v5_1 } = e;
            dataView(memory1).setInt16(base + 12, toUint16(v5_0), true);
            var [tuple6_0, tuple6_1, tuple6_2, tuple6_3] = v5_1;
            dataView(memory1).setInt8(base + 14, toUint8(tuple6_0), true);
            dataView(memory1).setInt8(base + 15, toUint8(tuple6_1), true);
            dataView(memory1).setInt8(base + 16, toUint8(tuple6_2), true);
            dataView(memory1).setInt8(base + 17, toUint8(tuple6_3), true);
            break;
          }
          case 'ipv6': {
            const e = variant9.val;
            dataView(memory1).setInt8(base + 8, 1, true);
            var {port: v7_0, flowInfo: v7_1, address: v7_2, scopeId: v7_3 } = e;
            dataView(memory1).setInt16(base + 12, toUint16(v7_0), true);
            dataView(memory1).setInt32(base + 16, toUint32(v7_1), true);
            var [tuple8_0, tuple8_1, tuple8_2, tuple8_3, tuple8_4, tuple8_5, tuple8_6, tuple8_7] = v7_2;
            dataView(memory1).setInt16(base + 20, toUint16(tuple8_0), true);
            dataView(memory1).setInt16(base + 22, toUint16(tuple8_1), true);
            dataView(memory1).setInt16(base + 24, toUint16(tuple8_2), true);
            dataView(memory1).setInt16(base + 26, toUint16(tuple8_3), true);
            dataView(memory1).setInt16(base + 28, toUint16(tuple8_4), true);
            dataView(memory1).setInt16(base + 30, toUint16(tuple8_5), true);
            dataView(memory1).setInt16(base + 32, toUint16(tuple8_6), true);
            dataView(memory1).setInt16(base + 34, toUint16(tuple8_7), true);
            dataView(memory1).setInt32(base + 36, toUint32(v7_3), true);
            break;
          }
          default: {
            throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant9.tag)}\` (received \`${variant9}\`) specified for \`IpSocketAddress\``);
          }
        }
      }
      dataView(memory1).setUint32(arg2 + 8, len10, true);
      dataView(memory1).setUint32(arg2 + 4, result10, true);
      break;
    }
    case 'err': {
      const e = variant12.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val11 = e;
      let enum11;
      switch (val11) {
        case 'unknown': {
          enum11 = 0;
          break;
        }
        case 'access-denied': {
          enum11 = 1;
          break;
        }
        case 'not-supported': {
          enum11 = 2;
          break;
        }
        case 'invalid-argument': {
          enum11 = 3;
          break;
        }
        case 'out-of-memory': {
          enum11 = 4;
          break;
        }
        case 'timeout': {
          enum11 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum11 = 6;
          break;
        }
        case 'not-in-progress': {
          enum11 = 7;
          break;
        }
        case 'would-block': {
          enum11 = 8;
          break;
        }
        case 'invalid-state': {
          enum11 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum11 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum11 = 11;
          break;
        }
        case 'address-in-use': {
          enum11 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum11 = 13;
          break;
        }
        case 'connection-refused': {
          enum11 = 14;
          break;
        }
        case 'connection-reset': {
          enum11 = 15;
          break;
        }
        case 'connection-aborted': {
          enum11 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum11 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum11 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum11 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum11 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val11}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 4, enum11, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]incoming-datagram-stream.receive"][Instruction::Return]', {
    funcName: '[method]incoming-datagram-stream.receive',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline143(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable30[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable11.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutgoingDatagramStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]outgoing-datagram-stream.check-send"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]outgoing-datagram-stream.check-send');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.checkSend()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]outgoing-datagram-stream.check-send"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      dataView(memory1).setBigInt64(arg1 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 8, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]outgoing-datagram-stream.check-send"][Instruction::Return]', {
    funcName: '[method]outgoing-datagram-stream.check-send',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline144(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable30[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable11.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutgoingDatagramStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var len6 = arg2;
  var base6 = arg1;
  var result6 = [];
  for (let i = 0; i < len6; i++) {
    const base = base6 + i * 44;
    var ptr3 = dataView(memory1).getUint32(base + 0, true);
    var len3 = dataView(memory1).getUint32(base + 4, true);
    var result3 = new Uint8Array(memory1.buffer.slice(ptr3, ptr3 + len3 * 1));
    let variant5;
    switch (dataView(memory1).getUint8(base + 8, true)) {
      case 0: {
        variant5 = undefined;
        break;
      }
      case 1: {
        let variant4;
        switch (dataView(memory1).getUint8(base + 12, true)) {
          case 0: {
            variant4= {
              tag: 'ipv4',
              val: {
                port: clampGuest(dataView(memory1).getUint16(base + 16, true), 0, 65535),
                address: [clampGuest(dataView(memory1).getUint8(base + 18, true), 0, 255), clampGuest(dataView(memory1).getUint8(base + 19, true), 0, 255), clampGuest(dataView(memory1).getUint8(base + 20, true), 0, 255), clampGuest(dataView(memory1).getUint8(base + 21, true), 0, 255)],
              }
            };
            break;
          }
          case 1: {
            variant4= {
              tag: 'ipv6',
              val: {
                port: clampGuest(dataView(memory1).getUint16(base + 16, true), 0, 65535),
                flowInfo: dataView(memory1).getInt32(base + 20, true) >>> 0,
                address: [clampGuest(dataView(memory1).getUint16(base + 24, true), 0, 65535), clampGuest(dataView(memory1).getUint16(base + 26, true), 0, 65535), clampGuest(dataView(memory1).getUint16(base + 28, true), 0, 65535), clampGuest(dataView(memory1).getUint16(base + 30, true), 0, 65535), clampGuest(dataView(memory1).getUint16(base + 32, true), 0, 65535), clampGuest(dataView(memory1).getUint16(base + 34, true), 0, 65535), clampGuest(dataView(memory1).getUint16(base + 36, true), 0, 65535), clampGuest(dataView(memory1).getUint16(base + 38, true), 0, 65535)],
                scopeId: dataView(memory1).getInt32(base + 40, true) >>> 0,
              }
            };
            break;
          }
          default: {
            throw new TypeError('invalid variant discriminant for IpSocketAddress');
          }
        }
        variant5 = variant4;
        break;
      }
      default: {
        throw new TypeError('invalid variant discriminant for option');
      }
    }
    result6.push({
      data: result3,
      remoteAddress: variant5,
    });
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]outgoing-datagram-stream.send"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]outgoing-datagram-stream.send');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.send(result6)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]outgoing-datagram-stream.send"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant8 = ret;
  switch (variant8.tag) {
    case 'ok': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg3 + 0, 0, true);
      dataView(memory1).setBigInt64(arg3 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg3 + 0, 1, true);
      var val7 = e;
      let enum7;
      switch (val7) {
        case 'unknown': {
          enum7 = 0;
          break;
        }
        case 'access-denied': {
          enum7 = 1;
          break;
        }
        case 'not-supported': {
          enum7 = 2;
          break;
        }
        case 'invalid-argument': {
          enum7 = 3;
          break;
        }
        case 'out-of-memory': {
          enum7 = 4;
          break;
        }
        case 'timeout': {
          enum7 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum7 = 6;
          break;
        }
        case 'not-in-progress': {
          enum7 = 7;
          break;
        }
        case 'would-block': {
          enum7 = 8;
          break;
        }
        case 'invalid-state': {
          enum7 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum7 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum7 = 11;
          break;
        }
        case 'address-in-use': {
          enum7 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum7 = 13;
          break;
        }
        case 'connection-refused': {
          enum7 = 14;
          break;
        }
        case 'connection-reset': {
          enum7 = 15;
          break;
        }
        case 'connection-aborted': {
          enum7 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum7 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum7 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum7 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum7 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val7}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg3 + 8, enum7, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp@0.2.0", function="[method]outgoing-datagram-stream.send"][Instruction::Return]', {
    funcName: '[method]outgoing-datagram-stream.send',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline145(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var handle4 = arg1;
  var rep5 = handleTable27[(handle4 << 1) + 1] & ~T_FLAG;
  var rsc3 = captureTable8.get(rep5);
  if (!rsc3) {
    rsc3 = Object.create(Network.prototype);
    Object.defineProperty(rsc3, symbolRscHandle, { writable: true, value: handle4});
    Object.defineProperty(rsc3, symbolRscRep, { writable: true, value: rep5});
  }
  curResourceBorrows.push(rsc3);
  let variant6;
  switch (arg2) {
    case 0: {
      variant6= {
        tag: 'ipv4',
        val: {
          port: clampGuest(arg3, 0, 65535),
          address: [clampGuest(arg4, 0, 255), clampGuest(arg5, 0, 255), clampGuest(arg6, 0, 255), clampGuest(arg7, 0, 255)],
        }
      };
      break;
    }
    case 1: {
      variant6= {
        tag: 'ipv6',
        val: {
          port: clampGuest(arg3, 0, 65535),
          flowInfo: arg4 >>> 0,
          address: [clampGuest(arg5, 0, 65535), clampGuest(arg6, 0, 65535), clampGuest(arg7, 0, 65535), clampGuest(arg8, 0, 65535), clampGuest(arg9, 0, 65535), clampGuest(arg10, 0, 65535), clampGuest(arg11, 0, 65535), clampGuest(arg12, 0, 65535)],
          scopeId: arg13 >>> 0,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for IpSocketAddress');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.start-bind"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.start-bind');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.startBind(rsc3, variant6)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.start-bind"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant8 = ret;
  switch (variant8.tag) {
    case 'ok': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg14 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg14 + 0, 1, true);
      var val7 = e;
      let enum7;
      switch (val7) {
        case 'unknown': {
          enum7 = 0;
          break;
        }
        case 'access-denied': {
          enum7 = 1;
          break;
        }
        case 'not-supported': {
          enum7 = 2;
          break;
        }
        case 'invalid-argument': {
          enum7 = 3;
          break;
        }
        case 'out-of-memory': {
          enum7 = 4;
          break;
        }
        case 'timeout': {
          enum7 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum7 = 6;
          break;
        }
        case 'not-in-progress': {
          enum7 = 7;
          break;
        }
        case 'would-block': {
          enum7 = 8;
          break;
        }
        case 'invalid-state': {
          enum7 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum7 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum7 = 11;
          break;
        }
        case 'address-in-use': {
          enum7 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum7 = 13;
          break;
        }
        case 'connection-refused': {
          enum7 = 14;
          break;
        }
        case 'connection-reset': {
          enum7 = 15;
          break;
        }
        case 'connection-aborted': {
          enum7 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum7 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum7 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum7 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum7 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val7}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg14 + 1, enum7, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.start-bind"][Instruction::Return]', {
    funcName: '[method]tcp-socket.start-bind',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline146(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.finish-bind"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.finish-bind');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.finishBind()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.finish-bind"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.finish-bind"][Instruction::Return]', {
    funcName: '[method]tcp-socket.finish-bind',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline147(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var handle4 = arg1;
  var rep5 = handleTable27[(handle4 << 1) + 1] & ~T_FLAG;
  var rsc3 = captureTable8.get(rep5);
  if (!rsc3) {
    rsc3 = Object.create(Network.prototype);
    Object.defineProperty(rsc3, symbolRscHandle, { writable: true, value: handle4});
    Object.defineProperty(rsc3, symbolRscRep, { writable: true, value: rep5});
  }
  curResourceBorrows.push(rsc3);
  let variant6;
  switch (arg2) {
    case 0: {
      variant6= {
        tag: 'ipv4',
        val: {
          port: clampGuest(arg3, 0, 65535),
          address: [clampGuest(arg4, 0, 255), clampGuest(arg5, 0, 255), clampGuest(arg6, 0, 255), clampGuest(arg7, 0, 255)],
        }
      };
      break;
    }
    case 1: {
      variant6= {
        tag: 'ipv6',
        val: {
          port: clampGuest(arg3, 0, 65535),
          flowInfo: arg4 >>> 0,
          address: [clampGuest(arg5, 0, 65535), clampGuest(arg6, 0, 65535), clampGuest(arg7, 0, 65535), clampGuest(arg8, 0, 65535), clampGuest(arg9, 0, 65535), clampGuest(arg10, 0, 65535), clampGuest(arg11, 0, 65535), clampGuest(arg12, 0, 65535)],
          scopeId: arg13 >>> 0,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for IpSocketAddress');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.start-connect"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.start-connect');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.startConnect(rsc3, variant6)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.start-connect"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant8 = ret;
  switch (variant8.tag) {
    case 'ok': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg14 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg14 + 0, 1, true);
      var val7 = e;
      let enum7;
      switch (val7) {
        case 'unknown': {
          enum7 = 0;
          break;
        }
        case 'access-denied': {
          enum7 = 1;
          break;
        }
        case 'not-supported': {
          enum7 = 2;
          break;
        }
        case 'invalid-argument': {
          enum7 = 3;
          break;
        }
        case 'out-of-memory': {
          enum7 = 4;
          break;
        }
        case 'timeout': {
          enum7 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum7 = 6;
          break;
        }
        case 'not-in-progress': {
          enum7 = 7;
          break;
        }
        case 'would-block': {
          enum7 = 8;
          break;
        }
        case 'invalid-state': {
          enum7 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum7 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum7 = 11;
          break;
        }
        case 'address-in-use': {
          enum7 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum7 = 13;
          break;
        }
        case 'connection-refused': {
          enum7 = 14;
          break;
        }
        case 'connection-reset': {
          enum7 = 15;
          break;
        }
        case 'connection-aborted': {
          enum7 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum7 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum7 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum7 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum7 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val7}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg14 + 1, enum7, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.start-connect"][Instruction::Return]', {
    funcName: '[method]tcp-socket.start-connect',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline148(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.finish-connect"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.finish-connect');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.finishConnect()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.finish-connect"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant7 = ret;
  switch (variant7.tag) {
    case 'ok': {
      const e = variant7.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      var [tuple3_0, tuple3_1] = e;
      if (!(tuple3_0 instanceof InputStream)) {
        throw new TypeError('Resource error: Not a valid "InputStream" resource.');
      }
      var handle4 = tuple3_0[symbolRscHandle];
      if (!handle4) {
        const rep = tuple3_0[symbolRscRep] || ++captureCnt2;
        captureTable2.set(rep, tuple3_0);
        handle4 = rscTableCreateOwn(handleTable23, rep);
      }
      dataView(memory1).setInt32(arg1 + 4, handle4, true);
      if (!(tuple3_1 instanceof OutputStream)) {
        throw new TypeError('Resource error: Not a valid "OutputStream" resource.');
      }
      var handle5 = tuple3_1[symbolRscHandle];
      if (!handle5) {
        const rep = tuple3_1[symbolRscRep] || ++captureCnt3;
        captureTable3.set(rep, tuple3_1);
        handle5 = rscTableCreateOwn(handleTable24, rep);
      }
      dataView(memory1).setInt32(arg1 + 8, handle5, true);
      break;
    }
    case 'err': {
      const e = variant7.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val6 = e;
      let enum6;
      switch (val6) {
        case 'unknown': {
          enum6 = 0;
          break;
        }
        case 'access-denied': {
          enum6 = 1;
          break;
        }
        case 'not-supported': {
          enum6 = 2;
          break;
        }
        case 'invalid-argument': {
          enum6 = 3;
          break;
        }
        case 'out-of-memory': {
          enum6 = 4;
          break;
        }
        case 'timeout': {
          enum6 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum6 = 6;
          break;
        }
        case 'not-in-progress': {
          enum6 = 7;
          break;
        }
        case 'would-block': {
          enum6 = 8;
          break;
        }
        case 'invalid-state': {
          enum6 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum6 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum6 = 11;
          break;
        }
        case 'address-in-use': {
          enum6 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum6 = 13;
          break;
        }
        case 'connection-refused': {
          enum6 = 14;
          break;
        }
        case 'connection-reset': {
          enum6 = 15;
          break;
        }
        case 'connection-aborted': {
          enum6 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum6 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum6 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum6 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum6 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val6}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 4, enum6, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.finish-connect"][Instruction::Return]', {
    funcName: '[method]tcp-socket.finish-connect',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline149(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.start-listen"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.start-listen');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.startListen()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.start-listen"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.start-listen"][Instruction::Return]', {
    funcName: '[method]tcp-socket.start-listen',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline150(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.finish-listen"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.finish-listen');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.finishListen()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.finish-listen"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.finish-listen"][Instruction::Return]', {
    funcName: '[method]tcp-socket.finish-listen',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline151(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.accept"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.accept');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.accept()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.accept"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant8 = ret;
  switch (variant8.tag) {
    case 'ok': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      var [tuple3_0, tuple3_1, tuple3_2] = e;
      if (!(tuple3_0 instanceof TcpSocket)) {
        throw new TypeError('Resource error: Not a valid "TcpSocket" resource.');
      }
      var handle4 = tuple3_0[symbolRscHandle];
      if (!handle4) {
        const rep = tuple3_0[symbolRscRep] || ++captureCnt12;
        captureTable12.set(rep, tuple3_0);
        handle4 = rscTableCreateOwn(handleTable31, rep);
      }
      dataView(memory1).setInt32(arg1 + 4, handle4, true);
      if (!(tuple3_1 instanceof InputStream)) {
        throw new TypeError('Resource error: Not a valid "InputStream" resource.');
      }
      var handle5 = tuple3_1[symbolRscHandle];
      if (!handle5) {
        const rep = tuple3_1[symbolRscRep] || ++captureCnt2;
        captureTable2.set(rep, tuple3_1);
        handle5 = rscTableCreateOwn(handleTable23, rep);
      }
      dataView(memory1).setInt32(arg1 + 8, handle5, true);
      if (!(tuple3_2 instanceof OutputStream)) {
        throw new TypeError('Resource error: Not a valid "OutputStream" resource.');
      }
      var handle6 = tuple3_2[symbolRscHandle];
      if (!handle6) {
        const rep = tuple3_2[symbolRscRep] || ++captureCnt3;
        captureTable3.set(rep, tuple3_2);
        handle6 = rscTableCreateOwn(handleTable24, rep);
      }
      dataView(memory1).setInt32(arg1 + 12, handle6, true);
      break;
    }
    case 'err': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val7 = e;
      let enum7;
      switch (val7) {
        case 'unknown': {
          enum7 = 0;
          break;
        }
        case 'access-denied': {
          enum7 = 1;
          break;
        }
        case 'not-supported': {
          enum7 = 2;
          break;
        }
        case 'invalid-argument': {
          enum7 = 3;
          break;
        }
        case 'out-of-memory': {
          enum7 = 4;
          break;
        }
        case 'timeout': {
          enum7 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum7 = 6;
          break;
        }
        case 'not-in-progress': {
          enum7 = 7;
          break;
        }
        case 'would-block': {
          enum7 = 8;
          break;
        }
        case 'invalid-state': {
          enum7 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum7 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum7 = 11;
          break;
        }
        case 'address-in-use': {
          enum7 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum7 = 13;
          break;
        }
        case 'connection-refused': {
          enum7 = 14;
          break;
        }
        case 'connection-reset': {
          enum7 = 15;
          break;
        }
        case 'connection-aborted': {
          enum7 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum7 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum7 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum7 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum7 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val7}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 4, enum7, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.accept"][Instruction::Return]', {
    funcName: '[method]tcp-socket.accept',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline152(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.local-address"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.local-address');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.localAddress()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.local-address"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant9 = ret;
  switch (variant9.tag) {
    case 'ok': {
      const e = variant9.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      var variant7 = e;
      switch (variant7.tag) {
        case 'ipv4': {
          const e = variant7.val;
          dataView(memory1).setInt8(arg1 + 4, 0, true);
          var {port: v3_0, address: v3_1 } = e;
          dataView(memory1).setInt16(arg1 + 8, toUint16(v3_0), true);
          var [tuple4_0, tuple4_1, tuple4_2, tuple4_3] = v3_1;
          dataView(memory1).setInt8(arg1 + 10, toUint8(tuple4_0), true);
          dataView(memory1).setInt8(arg1 + 11, toUint8(tuple4_1), true);
          dataView(memory1).setInt8(arg1 + 12, toUint8(tuple4_2), true);
          dataView(memory1).setInt8(arg1 + 13, toUint8(tuple4_3), true);
          break;
        }
        case 'ipv6': {
          const e = variant7.val;
          dataView(memory1).setInt8(arg1 + 4, 1, true);
          var {port: v5_0, flowInfo: v5_1, address: v5_2, scopeId: v5_3 } = e;
          dataView(memory1).setInt16(arg1 + 8, toUint16(v5_0), true);
          dataView(memory1).setInt32(arg1 + 12, toUint32(v5_1), true);
          var [tuple6_0, tuple6_1, tuple6_2, tuple6_3, tuple6_4, tuple6_5, tuple6_6, tuple6_7] = v5_2;
          dataView(memory1).setInt16(arg1 + 16, toUint16(tuple6_0), true);
          dataView(memory1).setInt16(arg1 + 18, toUint16(tuple6_1), true);
          dataView(memory1).setInt16(arg1 + 20, toUint16(tuple6_2), true);
          dataView(memory1).setInt16(arg1 + 22, toUint16(tuple6_3), true);
          dataView(memory1).setInt16(arg1 + 24, toUint16(tuple6_4), true);
          dataView(memory1).setInt16(arg1 + 26, toUint16(tuple6_5), true);
          dataView(memory1).setInt16(arg1 + 28, toUint16(tuple6_6), true);
          dataView(memory1).setInt16(arg1 + 30, toUint16(tuple6_7), true);
          dataView(memory1).setInt32(arg1 + 32, toUint32(v5_3), true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant7.tag)}\` (received \`${variant7}\`) specified for \`IpSocketAddress\``);
        }
      }
      break;
    }
    case 'err': {
      const e = variant9.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val8 = e;
      let enum8;
      switch (val8) {
        case 'unknown': {
          enum8 = 0;
          break;
        }
        case 'access-denied': {
          enum8 = 1;
          break;
        }
        case 'not-supported': {
          enum8 = 2;
          break;
        }
        case 'invalid-argument': {
          enum8 = 3;
          break;
        }
        case 'out-of-memory': {
          enum8 = 4;
          break;
        }
        case 'timeout': {
          enum8 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum8 = 6;
          break;
        }
        case 'not-in-progress': {
          enum8 = 7;
          break;
        }
        case 'would-block': {
          enum8 = 8;
          break;
        }
        case 'invalid-state': {
          enum8 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum8 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum8 = 11;
          break;
        }
        case 'address-in-use': {
          enum8 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum8 = 13;
          break;
        }
        case 'connection-refused': {
          enum8 = 14;
          break;
        }
        case 'connection-reset': {
          enum8 = 15;
          break;
        }
        case 'connection-aborted': {
          enum8 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum8 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum8 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum8 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum8 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val8}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 4, enum8, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.local-address"][Instruction::Return]', {
    funcName: '[method]tcp-socket.local-address',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline153(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.remote-address"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.remote-address');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.remoteAddress()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.remote-address"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant9 = ret;
  switch (variant9.tag) {
    case 'ok': {
      const e = variant9.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      var variant7 = e;
      switch (variant7.tag) {
        case 'ipv4': {
          const e = variant7.val;
          dataView(memory1).setInt8(arg1 + 4, 0, true);
          var {port: v3_0, address: v3_1 } = e;
          dataView(memory1).setInt16(arg1 + 8, toUint16(v3_0), true);
          var [tuple4_0, tuple4_1, tuple4_2, tuple4_3] = v3_1;
          dataView(memory1).setInt8(arg1 + 10, toUint8(tuple4_0), true);
          dataView(memory1).setInt8(arg1 + 11, toUint8(tuple4_1), true);
          dataView(memory1).setInt8(arg1 + 12, toUint8(tuple4_2), true);
          dataView(memory1).setInt8(arg1 + 13, toUint8(tuple4_3), true);
          break;
        }
        case 'ipv6': {
          const e = variant7.val;
          dataView(memory1).setInt8(arg1 + 4, 1, true);
          var {port: v5_0, flowInfo: v5_1, address: v5_2, scopeId: v5_3 } = e;
          dataView(memory1).setInt16(arg1 + 8, toUint16(v5_0), true);
          dataView(memory1).setInt32(arg1 + 12, toUint32(v5_1), true);
          var [tuple6_0, tuple6_1, tuple6_2, tuple6_3, tuple6_4, tuple6_5, tuple6_6, tuple6_7] = v5_2;
          dataView(memory1).setInt16(arg1 + 16, toUint16(tuple6_0), true);
          dataView(memory1).setInt16(arg1 + 18, toUint16(tuple6_1), true);
          dataView(memory1).setInt16(arg1 + 20, toUint16(tuple6_2), true);
          dataView(memory1).setInt16(arg1 + 22, toUint16(tuple6_3), true);
          dataView(memory1).setInt16(arg1 + 24, toUint16(tuple6_4), true);
          dataView(memory1).setInt16(arg1 + 26, toUint16(tuple6_5), true);
          dataView(memory1).setInt16(arg1 + 28, toUint16(tuple6_6), true);
          dataView(memory1).setInt16(arg1 + 30, toUint16(tuple6_7), true);
          dataView(memory1).setInt32(arg1 + 32, toUint32(v5_3), true);
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant7.tag)}\` (received \`${variant7}\`) specified for \`IpSocketAddress\``);
        }
      }
      break;
    }
    case 'err': {
      const e = variant9.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val8 = e;
      let enum8;
      switch (val8) {
        case 'unknown': {
          enum8 = 0;
          break;
        }
        case 'access-denied': {
          enum8 = 1;
          break;
        }
        case 'not-supported': {
          enum8 = 2;
          break;
        }
        case 'invalid-argument': {
          enum8 = 3;
          break;
        }
        case 'out-of-memory': {
          enum8 = 4;
          break;
        }
        case 'timeout': {
          enum8 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum8 = 6;
          break;
        }
        case 'not-in-progress': {
          enum8 = 7;
          break;
        }
        case 'would-block': {
          enum8 = 8;
          break;
        }
        case 'invalid-state': {
          enum8 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum8 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum8 = 11;
          break;
        }
        case 'address-in-use': {
          enum8 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum8 = 13;
          break;
        }
        case 'connection-refused': {
          enum8 = 14;
          break;
        }
        case 'connection-reset': {
          enum8 = 15;
          break;
        }
        case 'connection-aborted': {
          enum8 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum8 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum8 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum8 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum8 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val8}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 4, enum8, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.remote-address"][Instruction::Return]', {
    funcName: '[method]tcp-socket.remote-address',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline154(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-listen-backlog-size"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.set-listen-backlog-size');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.setListenBacklogSize(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-listen-backlog-size"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-listen-backlog-size"][Instruction::Return]', {
    funcName: '[method]tcp-socket.set-listen-backlog-size',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline155(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.keep-alive-enabled"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.keep-alive-enabled');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.keepAliveEnabled()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.keep-alive-enabled"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      dataView(memory1).setInt8(arg1 + 1, e ? 1 : 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.keep-alive-enabled"][Instruction::Return]', {
    funcName: '[method]tcp-socket.keep-alive-enabled',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline156(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var bool3 = arg1;
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-keep-alive-enabled"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.set-keep-alive-enabled');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.setKeepAliveEnabled(bool3 == 0 ? false : (bool3 == 1 ? true : throwInvalidBool()))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-keep-alive-enabled"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'unknown': {
          enum4 = 0;
          break;
        }
        case 'access-denied': {
          enum4 = 1;
          break;
        }
        case 'not-supported': {
          enum4 = 2;
          break;
        }
        case 'invalid-argument': {
          enum4 = 3;
          break;
        }
        case 'out-of-memory': {
          enum4 = 4;
          break;
        }
        case 'timeout': {
          enum4 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum4 = 6;
          break;
        }
        case 'not-in-progress': {
          enum4 = 7;
          break;
        }
        case 'would-block': {
          enum4 = 8;
          break;
        }
        case 'invalid-state': {
          enum4 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum4 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum4 = 11;
          break;
        }
        case 'address-in-use': {
          enum4 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum4 = 13;
          break;
        }
        case 'connection-refused': {
          enum4 = 14;
          break;
        }
        case 'connection-reset': {
          enum4 = 15;
          break;
        }
        case 'connection-aborted': {
          enum4 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum4 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum4 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum4 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum4 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 1, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-keep-alive-enabled"][Instruction::Return]', {
    funcName: '[method]tcp-socket.set-keep-alive-enabled',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline157(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.keep-alive-idle-time"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.keep-alive-idle-time');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.keepAliveIdleTime()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.keep-alive-idle-time"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      dataView(memory1).setBigInt64(arg1 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 8, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.keep-alive-idle-time"][Instruction::Return]', {
    funcName: '[method]tcp-socket.keep-alive-idle-time',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline158(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-keep-alive-idle-time"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.set-keep-alive-idle-time');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.setKeepAliveIdleTime(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-keep-alive-idle-time"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-keep-alive-idle-time"][Instruction::Return]', {
    funcName: '[method]tcp-socket.set-keep-alive-idle-time',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline159(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.keep-alive-interval"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.keep-alive-interval');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.keepAliveInterval()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.keep-alive-interval"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      dataView(memory1).setBigInt64(arg1 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 8, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.keep-alive-interval"][Instruction::Return]', {
    funcName: '[method]tcp-socket.keep-alive-interval',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline160(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-keep-alive-interval"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.set-keep-alive-interval');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.setKeepAliveInterval(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-keep-alive-interval"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-keep-alive-interval"][Instruction::Return]', {
    funcName: '[method]tcp-socket.set-keep-alive-interval',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline161(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.keep-alive-count"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.keep-alive-count');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.keepAliveCount()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.keep-alive-count"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      dataView(memory1).setInt32(arg1 + 4, toUint32(e), true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 4, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.keep-alive-count"][Instruction::Return]', {
    funcName: '[method]tcp-socket.keep-alive-count',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline162(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-keep-alive-count"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.set-keep-alive-count');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.setKeepAliveCount(arg1 >>> 0)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-keep-alive-count"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-keep-alive-count"][Instruction::Return]', {
    funcName: '[method]tcp-socket.set-keep-alive-count',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline163(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.hop-limit"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.hop-limit');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.hopLimit()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.hop-limit"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      dataView(memory1).setInt8(arg1 + 1, toUint8(e), true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.hop-limit"][Instruction::Return]', {
    funcName: '[method]tcp-socket.hop-limit',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline164(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-hop-limit"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.set-hop-limit');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.setHopLimit(clampGuest(arg1, 0, 255))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-hop-limit"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-hop-limit"][Instruction::Return]', {
    funcName: '[method]tcp-socket.set-hop-limit',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline165(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.receive-buffer-size"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.receive-buffer-size');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.receiveBufferSize()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.receive-buffer-size"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      dataView(memory1).setBigInt64(arg1 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 8, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.receive-buffer-size"][Instruction::Return]', {
    funcName: '[method]tcp-socket.receive-buffer-size',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline166(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-receive-buffer-size"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.set-receive-buffer-size');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.setReceiveBufferSize(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-receive-buffer-size"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-receive-buffer-size"][Instruction::Return]', {
    funcName: '[method]tcp-socket.set-receive-buffer-size',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline167(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.send-buffer-size"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.send-buffer-size');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.sendBufferSize()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.send-buffer-size"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      dataView(memory1).setBigInt64(arg1 + 8, toUint64(e), true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 8, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.send-buffer-size"][Instruction::Return]', {
    funcName: '[method]tcp-socket.send-buffer-size',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline168(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-send-buffer-size"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.set-send-buffer-size');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.setSendBufferSize(BigInt.asUintN(64, arg1))};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-send-buffer-size"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant4 = ret;
  switch (variant4.tag) {
    case 'ok': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant4.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val3 = e;
      let enum3;
      switch (val3) {
        case 'unknown': {
          enum3 = 0;
          break;
        }
        case 'access-denied': {
          enum3 = 1;
          break;
        }
        case 'not-supported': {
          enum3 = 2;
          break;
        }
        case 'invalid-argument': {
          enum3 = 3;
          break;
        }
        case 'out-of-memory': {
          enum3 = 4;
          break;
        }
        case 'timeout': {
          enum3 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum3 = 6;
          break;
        }
        case 'not-in-progress': {
          enum3 = 7;
          break;
        }
        case 'would-block': {
          enum3 = 8;
          break;
        }
        case 'invalid-state': {
          enum3 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum3 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum3 = 11;
          break;
        }
        case 'address-in-use': {
          enum3 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum3 = 13;
          break;
        }
        case 'connection-refused': {
          enum3 = 14;
          break;
        }
        case 'connection-reset': {
          enum3 = 15;
          break;
        }
        case 'connection-aborted': {
          enum3 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum3 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum3 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum3 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum3 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val3}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 1, enum3, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.set-send-buffer-size"][Instruction::Return]', {
    funcName: '[method]tcp-socket.set-send-buffer-size',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline169(arg0, arg1, arg2) {
  var handle1 = arg0;
  var rep2 = handleTable31[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable12.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(TcpSocket.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  let enum3;
  switch (arg1) {
    case 0: {
      enum3 = 'receive';
      break;
    }
    case 1: {
      enum3 = 'send';
      break;
    }
    case 2: {
      enum3 = 'both';
      break;
    }
    default: {
      throw new TypeError('invalid discriminant specified for ShutdownType');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.shutdown"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]tcp-socket.shutdown');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.shutdown(enum3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.shutdown"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant5 = ret;
  switch (variant5.tag) {
    case 'ok': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant5.val;
      dataView(memory1).setInt8(arg2 + 0, 1, true);
      var val4 = e;
      let enum4;
      switch (val4) {
        case 'unknown': {
          enum4 = 0;
          break;
        }
        case 'access-denied': {
          enum4 = 1;
          break;
        }
        case 'not-supported': {
          enum4 = 2;
          break;
        }
        case 'invalid-argument': {
          enum4 = 3;
          break;
        }
        case 'out-of-memory': {
          enum4 = 4;
          break;
        }
        case 'timeout': {
          enum4 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum4 = 6;
          break;
        }
        case 'not-in-progress': {
          enum4 = 7;
          break;
        }
        case 'would-block': {
          enum4 = 8;
          break;
        }
        case 'invalid-state': {
          enum4 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum4 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum4 = 11;
          break;
        }
        case 'address-in-use': {
          enum4 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum4 = 13;
          break;
        }
        case 'connection-refused': {
          enum4 = 14;
          break;
        }
        case 'connection-reset': {
          enum4 = 15;
          break;
        }
        case 'connection-aborted': {
          enum4 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum4 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum4 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum4 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum4 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val4}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg2 + 1, enum4, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp@0.2.0", function="[method]tcp-socket.shutdown"][Instruction::Return]', {
    funcName: '[method]tcp-socket.shutdown',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline170(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  var rep2 = handleTable27[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable8.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Network.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = utf8Decoder.decode(new Uint8Array(memory1.buffer, ptr3, len3));
  _debugLog('[iface="wasi:sockets/ip-name-lookup@0.2.0", function="resolve-addresses"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'resolve-addresses');
  let ret;
  try {
    ret = { tag: 'ok', val: resolveAddresses(rsc0, result3)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/ip-name-lookup@0.2.0", function="resolve-addresses"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg3 + 0, 0, true);
      if (!(e instanceof ResolveAddressStream)) {
        throw new TypeError('Resource error: Not a valid "ResolveAddressStream" resource.');
      }
      var handle4 = e[symbolRscHandle];
      if (!handle4) {
        const rep = e[symbolRscRep] || ++captureCnt13;
        captureTable13.set(rep, e);
        handle4 = rscTableCreateOwn(handleTable32, rep);
      }
      dataView(memory1).setInt32(arg3 + 4, handle4, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory1).setInt8(arg3 + 0, 1, true);
      var val5 = e;
      let enum5;
      switch (val5) {
        case 'unknown': {
          enum5 = 0;
          break;
        }
        case 'access-denied': {
          enum5 = 1;
          break;
        }
        case 'not-supported': {
          enum5 = 2;
          break;
        }
        case 'invalid-argument': {
          enum5 = 3;
          break;
        }
        case 'out-of-memory': {
          enum5 = 4;
          break;
        }
        case 'timeout': {
          enum5 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum5 = 6;
          break;
        }
        case 'not-in-progress': {
          enum5 = 7;
          break;
        }
        case 'would-block': {
          enum5 = 8;
          break;
        }
        case 'invalid-state': {
          enum5 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum5 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum5 = 11;
          break;
        }
        case 'address-in-use': {
          enum5 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum5 = 13;
          break;
        }
        case 'connection-refused': {
          enum5 = 14;
          break;
        }
        case 'connection-reset': {
          enum5 = 15;
          break;
        }
        case 'connection-aborted': {
          enum5 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum5 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum5 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum5 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum5 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val5}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg3 + 4, enum5, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/ip-name-lookup@0.2.0", function="resolve-addresses"][Instruction::Return]', {
    funcName: 'resolve-addresses',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline171(arg0, arg1) {
  var handle1 = arg0;
  var rep2 = handleTable32[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable13.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(ResolveAddressStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:sockets/ip-name-lookup@0.2.0", function="[method]resolve-address-stream.resolve-next-address"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, '[method]resolve-address-stream.resolve-next-address');
  let ret;
  try {
    ret = { tag: 'ok', val: rsc0.resolveNextAddress()};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/ip-name-lookup@0.2.0", function="[method]resolve-address-stream.resolve-next-address"] [Instruction::CallInterface] (sync, @ post-call)');
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  endCurrentTask(3);
  var variant8 = ret;
  switch (variant8.tag) {
    case 'ok': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      var variant6 = e;
      if (variant6 === null || variant6=== undefined) {
        dataView(memory1).setInt8(arg1 + 2, 0, true);
      } else {
        const e = variant6;
        dataView(memory1).setInt8(arg1 + 2, 1, true);
        var variant5 = e;
        switch (variant5.tag) {
          case 'ipv4': {
            const e = variant5.val;
            dataView(memory1).setInt8(arg1 + 4, 0, true);
            var [tuple3_0, tuple3_1, tuple3_2, tuple3_3] = e;
            dataView(memory1).setInt8(arg1 + 6, toUint8(tuple3_0), true);
            dataView(memory1).setInt8(arg1 + 7, toUint8(tuple3_1), true);
            dataView(memory1).setInt8(arg1 + 8, toUint8(tuple3_2), true);
            dataView(memory1).setInt8(arg1 + 9, toUint8(tuple3_3), true);
            break;
          }
          case 'ipv6': {
            const e = variant5.val;
            dataView(memory1).setInt8(arg1 + 4, 1, true);
            var [tuple4_0, tuple4_1, tuple4_2, tuple4_3, tuple4_4, tuple4_5, tuple4_6, tuple4_7] = e;
            dataView(memory1).setInt16(arg1 + 6, toUint16(tuple4_0), true);
            dataView(memory1).setInt16(arg1 + 8, toUint16(tuple4_1), true);
            dataView(memory1).setInt16(arg1 + 10, toUint16(tuple4_2), true);
            dataView(memory1).setInt16(arg1 + 12, toUint16(tuple4_3), true);
            dataView(memory1).setInt16(arg1 + 14, toUint16(tuple4_4), true);
            dataView(memory1).setInt16(arg1 + 16, toUint16(tuple4_5), true);
            dataView(memory1).setInt16(arg1 + 18, toUint16(tuple4_6), true);
            dataView(memory1).setInt16(arg1 + 20, toUint16(tuple4_7), true);
            break;
          }
          default: {
            throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`IpAddress\``);
          }
        }
      }
      break;
    }
    case 'err': {
      const e = variant8.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val7 = e;
      let enum7;
      switch (val7) {
        case 'unknown': {
          enum7 = 0;
          break;
        }
        case 'access-denied': {
          enum7 = 1;
          break;
        }
        case 'not-supported': {
          enum7 = 2;
          break;
        }
        case 'invalid-argument': {
          enum7 = 3;
          break;
        }
        case 'out-of-memory': {
          enum7 = 4;
          break;
        }
        case 'timeout': {
          enum7 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum7 = 6;
          break;
        }
        case 'not-in-progress': {
          enum7 = 7;
          break;
        }
        case 'would-block': {
          enum7 = 8;
          break;
        }
        case 'invalid-state': {
          enum7 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum7 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum7 = 11;
          break;
        }
        case 'address-in-use': {
          enum7 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum7 = 13;
          break;
        }
        case 'connection-refused': {
          enum7 = 14;
          break;
        }
        case 'connection-reset': {
          enum7 = 15;
          break;
        }
        case 'connection-aborted': {
          enum7 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum7 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum7 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum7 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum7 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val7}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 2, enum7, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/ip-name-lookup@0.2.0", function="[method]resolve-address-stream.resolve-next-address"][Instruction::Return]', {
    funcName: '[method]resolve-address-stream.resolve-next-address',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline172(arg0) {
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-environment"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-environment');
  const ret = getEnvironment();
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-environment"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var vec3 = ret;
  var len3 = vec3.length;
  var result3 = realloc3(0, 0, 4, len3 * 16);
  for (let i = 0; i < vec3.length; i++) {
    const e = vec3[i];
    const base = result3 + i * 16;var [tuple0_0, tuple0_1] = e;
    var ptr1 = utf8Encode(tuple0_0, realloc3, memory1);
    var len1 = utf8EncodedLen;
    dataView(memory1).setUint32(base + 4, len1, true);
    dataView(memory1).setUint32(base + 0, ptr1, true);
    var ptr2 = utf8Encode(tuple0_1, realloc3, memory1);
    var len2 = utf8EncodedLen;
    dataView(memory1).setUint32(base + 12, len2, true);
    dataView(memory1).setUint32(base + 8, ptr2, true);
  }
  dataView(memory1).setUint32(arg0 + 4, len3, true);
  dataView(memory1).setUint32(arg0 + 0, result3, true);
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-environment"][Instruction::Return]', {
    funcName: 'get-environment',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline173(arg0) {
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-arguments"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-arguments');
  const ret = getArguments();
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-arguments"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var vec1 = ret;
  var len1 = vec1.length;
  var result1 = realloc3(0, 0, 4, len1 * 8);
  for (let i = 0; i < vec1.length; i++) {
    const e = vec1[i];
    const base = result1 + i * 8;var ptr0 = utf8Encode(e, realloc3, memory1);
    var len0 = utf8EncodedLen;
    dataView(memory1).setUint32(base + 4, len0, true);
    dataView(memory1).setUint32(base + 0, ptr0, true);
  }
  dataView(memory1).setUint32(arg0 + 4, len1, true);
  dataView(memory1).setUint32(arg0 + 0, result1, true);
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="get-arguments"][Instruction::Return]', {
    funcName: 'get-arguments',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline174(arg0) {
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="initial-cwd"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'initial-cwd');
  const ret = initialCwd();
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="initial-cwd"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var variant1 = ret;
  if (variant1 === null || variant1=== undefined) {
    dataView(memory1).setInt8(arg0 + 0, 0, true);
  } else {
    const e = variant1;
    dataView(memory1).setInt8(arg0 + 0, 1, true);
    var ptr0 = utf8Encode(e, realloc3, memory1);
    var len0 = utf8EncodedLen;
    dataView(memory1).setUint32(arg0 + 8, len0, true);
    dataView(memory1).setUint32(arg0 + 4, ptr0, true);
  }
  _debugLog('[iface="wasi:cli/environment@0.2.0", function="initial-cwd"][Instruction::Return]', {
    funcName: 'initial-cwd',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline175(arg0) {
  _debugLog('[iface="wasi:filesystem/preopens@0.2.0", function="get-directories"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-directories');
  const ret = getDirectories();
  _debugLog('[iface="wasi:filesystem/preopens@0.2.0", function="get-directories"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var vec3 = ret;
  var len3 = vec3.length;
  var result3 = realloc3(0, 0, 4, len3 * 12);
  for (let i = 0; i < vec3.length; i++) {
    const e = vec3[i];
    const base = result3 + i * 12;var [tuple0_0, tuple0_1] = e;
    if (!(tuple0_0 instanceof Descriptor)) {
      throw new TypeError('Resource error: Not a valid "Descriptor" resource.');
    }
    var handle1 = tuple0_0[symbolRscHandle];
    if (!handle1) {
      const rep = tuple0_0[symbolRscRep] || ++captureCnt4;
      captureTable4.set(rep, tuple0_0);
      handle1 = rscTableCreateOwn(handleTable21, rep);
    }
    dataView(memory1).setInt32(base + 0, handle1, true);
    var ptr2 = utf8Encode(tuple0_1, realloc3, memory1);
    var len2 = utf8EncodedLen;
    dataView(memory1).setUint32(base + 8, len2, true);
    dataView(memory1).setUint32(base + 4, ptr2, true);
  }
  dataView(memory1).setUint32(arg0 + 4, len3, true);
  dataView(memory1).setUint32(arg0 + 0, result3, true);
  _debugLog('[iface="wasi:filesystem/preopens@0.2.0", function="get-directories"][Instruction::Return]', {
    funcName: 'get-directories',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline176(arg0, arg1) {
  let enum0;
  switch (arg0) {
    case 0: {
      enum0 = 'ipv4';
      break;
    }
    case 1: {
      enum0 = 'ipv6';
      break;
    }
    default: {
      throw new TypeError('invalid discriminant specified for IpAddressFamily');
    }
  }
  _debugLog('[iface="wasi:sockets/udp-create-socket@0.2.0", function="create-udp-socket"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'create-udp-socket');
  let ret;
  try {
    ret = { tag: 'ok', val: createUdpSocket(enum0)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/udp-create-socket@0.2.0", function="create-udp-socket"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var variant3 = ret;
  switch (variant3.tag) {
    case 'ok': {
      const e = variant3.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      if (!(e instanceof UdpSocket)) {
        throw new TypeError('Resource error: Not a valid "UdpSocket" resource.');
      }
      var handle1 = e[symbolRscHandle];
      if (!handle1) {
        const rep = e[symbolRscRep] || ++captureCnt9;
        captureTable9.set(rep, e);
        handle1 = rscTableCreateOwn(handleTable28, rep);
      }
      dataView(memory1).setInt32(arg1 + 4, handle1, true);
      break;
    }
    case 'err': {
      const e = variant3.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val2 = e;
      let enum2;
      switch (val2) {
        case 'unknown': {
          enum2 = 0;
          break;
        }
        case 'access-denied': {
          enum2 = 1;
          break;
        }
        case 'not-supported': {
          enum2 = 2;
          break;
        }
        case 'invalid-argument': {
          enum2 = 3;
          break;
        }
        case 'out-of-memory': {
          enum2 = 4;
          break;
        }
        case 'timeout': {
          enum2 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum2 = 6;
          break;
        }
        case 'not-in-progress': {
          enum2 = 7;
          break;
        }
        case 'would-block': {
          enum2 = 8;
          break;
        }
        case 'invalid-state': {
          enum2 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum2 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum2 = 11;
          break;
        }
        case 'address-in-use': {
          enum2 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum2 = 13;
          break;
        }
        case 'connection-refused': {
          enum2 = 14;
          break;
        }
        case 'connection-reset': {
          enum2 = 15;
          break;
        }
        case 'connection-aborted': {
          enum2 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum2 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum2 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum2 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum2 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val2}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 4, enum2, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/udp-create-socket@0.2.0", function="create-udp-socket"][Instruction::Return]', {
    funcName: 'create-udp-socket',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline177(arg0, arg1) {
  let enum0;
  switch (arg0) {
    case 0: {
      enum0 = 'ipv4';
      break;
    }
    case 1: {
      enum0 = 'ipv6';
      break;
    }
    default: {
      throw new TypeError('invalid discriminant specified for IpAddressFamily');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp-create-socket@0.2.0", function="create-tcp-socket"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'create-tcp-socket');
  let ret;
  try {
    ret = { tag: 'ok', val: createTcpSocket(enum0)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  _debugLog('[iface="wasi:sockets/tcp-create-socket@0.2.0", function="create-tcp-socket"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var variant3 = ret;
  switch (variant3.tag) {
    case 'ok': {
      const e = variant3.val;
      dataView(memory1).setInt8(arg1 + 0, 0, true);
      if (!(e instanceof TcpSocket)) {
        throw new TypeError('Resource error: Not a valid "TcpSocket" resource.');
      }
      var handle1 = e[symbolRscHandle];
      if (!handle1) {
        const rep = e[symbolRscRep] || ++captureCnt12;
        captureTable12.set(rep, e);
        handle1 = rscTableCreateOwn(handleTable31, rep);
      }
      dataView(memory1).setInt32(arg1 + 4, handle1, true);
      break;
    }
    case 'err': {
      const e = variant3.val;
      dataView(memory1).setInt8(arg1 + 0, 1, true);
      var val2 = e;
      let enum2;
      switch (val2) {
        case 'unknown': {
          enum2 = 0;
          break;
        }
        case 'access-denied': {
          enum2 = 1;
          break;
        }
        case 'not-supported': {
          enum2 = 2;
          break;
        }
        case 'invalid-argument': {
          enum2 = 3;
          break;
        }
        case 'out-of-memory': {
          enum2 = 4;
          break;
        }
        case 'timeout': {
          enum2 = 5;
          break;
        }
        case 'concurrency-conflict': {
          enum2 = 6;
          break;
        }
        case 'not-in-progress': {
          enum2 = 7;
          break;
        }
        case 'would-block': {
          enum2 = 8;
          break;
        }
        case 'invalid-state': {
          enum2 = 9;
          break;
        }
        case 'new-socket-limit': {
          enum2 = 10;
          break;
        }
        case 'address-not-bindable': {
          enum2 = 11;
          break;
        }
        case 'address-in-use': {
          enum2 = 12;
          break;
        }
        case 'remote-unreachable': {
          enum2 = 13;
          break;
        }
        case 'connection-refused': {
          enum2 = 14;
          break;
        }
        case 'connection-reset': {
          enum2 = 15;
          break;
        }
        case 'connection-aborted': {
          enum2 = 16;
          break;
        }
        case 'datagram-too-large': {
          enum2 = 17;
          break;
        }
        case 'name-unresolvable': {
          enum2 = 18;
          break;
        }
        case 'temporary-resolver-failure': {
          enum2 = 19;
          break;
        }
        case 'permanent-resolver-failure': {
          enum2 = 20;
          break;
        }
        default: {
          if ((e) instanceof Error) {
            console.error(e);
          }
          
          throw new TypeError(`"${val2}" is not one of the cases of error-code`);
        }
      }
      dataView(memory1).setInt8(arg1 + 4, enum2, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
  _debugLog('[iface="wasi:sockets/tcp-create-socket@0.2.0", function="create-tcp-socket"][Instruction::Return]', {
    funcName: 'create-tcp-socket',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline178(arg0, arg1) {
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-bytes"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-random-bytes');
  const ret = getRandomBytes(BigInt.asUintN(64, arg0));
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-bytes"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var val0 = ret;
  var len0 = val0.byteLength;
  var ptr0 = realloc3(0, 0, 1, len0 * 1);
  var src0 = new Uint8Array(val0.buffer || val0, val0.byteOffset, len0 * 1);
  (new Uint8Array(memory1.buffer, ptr0, len0 * 1)).set(src0);
  dataView(memory1).setUint32(arg1 + 4, len0, true);
  dataView(memory1).setUint32(arg1 + 0, ptr0, true);
  _debugLog('[iface="wasi:random/random@0.2.0", function="get-random-bytes"][Instruction::Return]', {
    funcName: 'get-random-bytes',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline179(arg0, arg1) {
  _debugLog('[iface="wasi:random/insecure@0.2.0", function="get-insecure-random-bytes"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'get-insecure-random-bytes');
  const ret = getInsecureRandomBytes(BigInt.asUintN(64, arg0));
  _debugLog('[iface="wasi:random/insecure@0.2.0", function="get-insecure-random-bytes"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var val0 = ret;
  var len0 = val0.byteLength;
  var ptr0 = realloc3(0, 0, 1, len0 * 1);
  var src0 = new Uint8Array(val0.buffer || val0, val0.byteOffset, len0 * 1);
  (new Uint8Array(memory1.buffer, ptr0, len0 * 1)).set(src0);
  dataView(memory1).setUint32(arg1 + 4, len0, true);
  dataView(memory1).setUint32(arg1 + 0, ptr0, true);
  _debugLog('[iface="wasi:random/insecure@0.2.0", function="get-insecure-random-bytes"][Instruction::Return]', {
    funcName: 'get-insecure-random-bytes',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}


function trampoline180(arg0) {
  _debugLog('[iface="wasi:random/insecure-seed@0.2.0", function="insecure-seed"] [Instruction::CallInterface] (async? sync, @ enter)');
  const _interface_call_currentTaskID = startCurrentTask(3, false, 'insecure-seed');
  const ret = insecureSeed();
  _debugLog('[iface="wasi:random/insecure-seed@0.2.0", function="insecure-seed"] [Instruction::CallInterface] (sync, @ post-call)');
  endCurrentTask(3);
  var [tuple0_0, tuple0_1] = ret;
  dataView(memory1).setBigInt64(arg0 + 0, toUint64(tuple0_0), true);
  dataView(memory1).setBigInt64(arg0 + 8, toUint64(tuple0_1), true);
  _debugLog('[iface="wasi:random/insecure-seed@0.2.0", function="insecure-seed"][Instruction::Return]', {
    funcName: 'insecure-seed',
    paramCount: 0,
    async: false,
    postReturn: false
  });
}

let exports16;
let exports17;
let exports18;
let exports19;
let memory2;
let exports20;
let exports21;
let realloc4;
let postReturn0;
let postReturn1;
let postReturn2;
function trampoline0(handle) {
  const handleEntry = rscTableRemove(handleTable14, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable2.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable2.delete(handleEntry.rep);
    } else if (InputStream[symbolCabiDispose]) {
      InputStream[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline1(handle) {
  const handleEntry = rscTableRemove(handleTable15, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable3.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable3.delete(handleEntry.rep);
    } else if (OutputStream[symbolCabiDispose]) {
      OutputStream[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline7(handle) {
  const handleEntry = rscTableRemove(handleTable16, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable4.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable4.delete(handleEntry.rep);
    } else if (Descriptor[symbolCabiDispose]) {
      Descriptor[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline8(handle) {
  const handleEntry = rscTableRemove(handleTable17, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable5.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable5.delete(handleEntry.rep);
    } else if (DirectoryEntryStream[symbolCabiDispose]) {
      DirectoryEntryStream[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline35(handle) {
  const handleEntry = rscTableRemove(handleTable20, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable5.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable5.delete(handleEntry.rep);
    } else if (DirectoryEntryStream[symbolCabiDispose]) {
      DirectoryEntryStream[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline36(handle) {
  const handleEntry = rscTableRemove(handleTable22, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable0.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable0.delete(handleEntry.rep);
    } else if (Error$1[symbolCabiDispose]) {
      Error$1[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline37(handle) {
  const handleEntry = rscTableRemove(handleTable23, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable2.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable2.delete(handleEntry.rep);
    } else if (InputStream[symbolCabiDispose]) {
      InputStream[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline38(handle) {
  const handleEntry = rscTableRemove(handleTable24, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable3.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable3.delete(handleEntry.rep);
    } else if (OutputStream[symbolCabiDispose]) {
      OutputStream[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline39(handle) {
  const handleEntry = rscTableRemove(handleTable21, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable4.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable4.delete(handleEntry.rep);
    } else if (Descriptor[symbolCabiDispose]) {
      Descriptor[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline44(handle) {
  const handleEntry = rscTableRemove(handleTable19, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable1.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable1.delete(handleEntry.rep);
    } else if (Pollable[symbolCabiDispose]) {
      Pollable[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline45(handle) {
  const handleEntry = rscTableRemove(handleTable25, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable7.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable7.delete(handleEntry.rep);
    } else if (TerminalOutput[symbolCabiDispose]) {
      TerminalOutput[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline46(handle) {
  const handleEntry = rscTableRemove(handleTable26, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable6.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable6.delete(handleEntry.rep);
    } else if (TerminalInput[symbolCabiDispose]) {
      TerminalInput[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline51(handle) {
  const handleEntry = rscTableRemove(handleTable27, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable8.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable8.delete(handleEntry.rep);
    } else if (Network[symbolCabiDispose]) {
      Network[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline52(handle) {
  const handleEntry = rscTableRemove(handleTable28, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable9.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable9.delete(handleEntry.rep);
    } else if (UdpSocket[symbolCabiDispose]) {
      UdpSocket[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline53(handle) {
  const handleEntry = rscTableRemove(handleTable29, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable10.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable10.delete(handleEntry.rep);
    } else if (IncomingDatagramStream[symbolCabiDispose]) {
      IncomingDatagramStream[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline54(handle) {
  const handleEntry = rscTableRemove(handleTable30, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable11.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable11.delete(handleEntry.rep);
    } else if (OutgoingDatagramStream[symbolCabiDispose]) {
      OutgoingDatagramStream[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline55(handle) {
  const handleEntry = rscTableRemove(handleTable31, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable12.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable12.delete(handleEntry.rep);
    } else if (TcpSocket[symbolCabiDispose]) {
      TcpSocket[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline56(handle) {
  const handleEntry = rscTableRemove(handleTable32, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable13.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable13.delete(handleEntry.rep);
    } else if (ResolveAddressStream[symbolCabiDispose]) {
      ResolveAddressStream[symbolCabiDispose](handleEntry.rep);
    }
  }
}
let bundled001Combinations;

function combinations(arg0, arg1) {
  var vec1 = arg0;
  var len1 = vec1.length;
  var result1 = realloc4(0, 0, 4, len1 * 8);
  for (let i = 0; i < vec1.length; i++) {
    const e = vec1[i];
    const base = result1 + i * 8;var ptr0 = utf8Encode(e, realloc4, memory2);
    var len0 = utf8EncodedLen;
    dataView(memory2).setUint32(base + 4, len0, true);
    dataView(memory2).setUint32(base + 0, ptr0, true);
  }
  _debugLog('[iface="iter-tpl:main/bundled@0.0.1", function="combinations"][Instruction::CallWasm] enter', {
    funcName: 'combinations',
    paramCount: 3,
    async: false,
    postReturn: true,
  });
  const _wasm_call_currentTaskID = startCurrentTask(6, false, 'bundled001Combinations');
  const ret = bundled001Combinations(result1, len1, toUint32(arg1));
  endCurrentTask(6);
  var len4 = dataView(memory2).getUint32(ret + 4, true);
  var base4 = dataView(memory2).getUint32(ret + 0, true);
  var result4 = [];
  for (let i = 0; i < len4; i++) {
    const base = base4 + i * 8;
    var len3 = dataView(memory2).getUint32(base + 4, true);
    var base3 = dataView(memory2).getUint32(base + 0, true);
    var result3 = [];
    for (let i = 0; i < len3; i++) {
      const base = base3 + i * 8;
      var ptr2 = dataView(memory2).getUint32(base + 0, true);
      var len2 = dataView(memory2).getUint32(base + 4, true);
      var result2 = utf8Decoder.decode(new Uint8Array(memory2.buffer, ptr2, len2));
      result3.push(result2);
    }
    result4.push(result3);
  }
  _debugLog('[iface="iter-tpl:main/bundled@0.0.1", function="combinations"][Instruction::Return]', {
    funcName: 'combinations',
    paramCount: 1,
    async: false,
    postReturn: true
  });
  const retCopy = result4;
  
  let cstate = getOrCreateAsyncState(6);
  cstate.mayLeave = false;
  postReturn0(ret);
  cstate.mayLeave = true;
  return retCopy;
  
}
let bundled001Permutations;

function permutations(arg0, arg1) {
  var vec1 = arg0;
  var len1 = vec1.length;
  var result1 = realloc4(0, 0, 4, len1 * 8);
  for (let i = 0; i < vec1.length; i++) {
    const e = vec1[i];
    const base = result1 + i * 8;var ptr0 = utf8Encode(e, realloc4, memory2);
    var len0 = utf8EncodedLen;
    dataView(memory2).setUint32(base + 4, len0, true);
    dataView(memory2).setUint32(base + 0, ptr0, true);
  }
  _debugLog('[iface="iter-tpl:main/bundled@0.0.1", function="permutations"][Instruction::CallWasm] enter', {
    funcName: 'permutations',
    paramCount: 3,
    async: false,
    postReturn: true,
  });
  const _wasm_call_currentTaskID = startCurrentTask(6, false, 'bundled001Permutations');
  const ret = bundled001Permutations(result1, len1, toUint32(arg1));
  endCurrentTask(6);
  var len4 = dataView(memory2).getUint32(ret + 4, true);
  var base4 = dataView(memory2).getUint32(ret + 0, true);
  var result4 = [];
  for (let i = 0; i < len4; i++) {
    const base = base4 + i * 8;
    var len3 = dataView(memory2).getUint32(base + 4, true);
    var base3 = dataView(memory2).getUint32(base + 0, true);
    var result3 = [];
    for (let i = 0; i < len3; i++) {
      const base = base3 + i * 8;
      var ptr2 = dataView(memory2).getUint32(base + 0, true);
      var len2 = dataView(memory2).getUint32(base + 4, true);
      var result2 = utf8Decoder.decode(new Uint8Array(memory2.buffer, ptr2, len2));
      result3.push(result2);
    }
    result4.push(result3);
  }
  _debugLog('[iface="iter-tpl:main/bundled@0.0.1", function="permutations"][Instruction::Return]', {
    funcName: 'permutations',
    paramCount: 1,
    async: false,
    postReturn: true
  });
  const retCopy = result4;
  
  let cstate = getOrCreateAsyncState(6);
  cstate.mayLeave = false;
  postReturn1(ret);
  cstate.mayLeave = true;
  return retCopy;
  
}
let bundled001Template;

function template(arg0, arg1) {
  var ptr0 = utf8Encode(arg0, realloc4, memory2);
  var len0 = utf8EncodedLen;
  var vec2 = arg1;
  var len2 = vec2.length;
  var result2 = realloc4(0, 0, 4, len2 * 8);
  for (let i = 0; i < vec2.length; i++) {
    const e = vec2[i];
    const base = result2 + i * 8;var ptr1 = utf8Encode(e, realloc4, memory2);
    var len1 = utf8EncodedLen;
    dataView(memory2).setUint32(base + 4, len1, true);
    dataView(memory2).setUint32(base + 0, ptr1, true);
  }
  _debugLog('[iface="iter-tpl:main/bundled@0.0.1", function="template"][Instruction::CallWasm] enter', {
    funcName: 'template',
    paramCount: 4,
    async: false,
    postReturn: true,
  });
  const _wasm_call_currentTaskID = startCurrentTask(6, false, 'bundled001Template');
  const ret = bundled001Template(ptr0, len0, result2, len2);
  endCurrentTask(6);
  let variant5;
  switch (dataView(memory2).getUint8(ret + 0, true)) {
    case 0: {
      var ptr3 = dataView(memory2).getUint32(ret + 4, true);
      var len3 = dataView(memory2).getUint32(ret + 8, true);
      var result3 = utf8Decoder.decode(new Uint8Array(memory2.buffer, ptr3, len3));
      variant5= {
        tag: 'ok',
        val: result3
      };
      break;
    }
    case 1: {
      var ptr4 = dataView(memory2).getUint32(ret + 4, true);
      var len4 = dataView(memory2).getUint32(ret + 8, true);
      var result4 = utf8Decoder.decode(new Uint8Array(memory2.buffer, ptr4, len4));
      variant5= {
        tag: 'err',
        val: result4
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  _debugLog('[iface="iter-tpl:main/bundled@0.0.1", function="template"][Instruction::Return]', {
    funcName: 'template',
    paramCount: 1,
    async: false,
    postReturn: true
  });
  const retCopy = variant5;
  
  let cstate = getOrCreateAsyncState(6);
  cstate.mayLeave = false;
  postReturn2(ret);
  cstate.mayLeave = true;
  
  
  
  if (typeof retCopy === 'object' && retCopy.tag === 'err') {
    throw new ComponentError(retCopy.val);
  }
  return retCopy.val;
  
}
function trampoline181(from_ptr, len, to_ptr) {
  new Uint8Array(memory1.buffer, to_ptr, len).set(new Uint8Array(memory2.buffer, from_ptr, len));
}

function trampoline182(from_ptr, len, to_ptr) {
  new Uint8Array(memory2.buffer, to_ptr, len).set(new Uint8Array(memory1.buffer, from_ptr, len));
}

function trampoline183(from_ptr, len, to_ptr) {
  new Uint8Array(memory0.buffer, to_ptr, len).set(new Uint8Array(memory2.buffer, from_ptr, len));
}

function trampoline184(from_ptr, len, to_ptr) {
  new Uint8Array(memory2.buffer, to_ptr, len).set(new Uint8Array(memory0.buffer, from_ptr, len));
}


const $init = (() => {
  let gen = (function* _initGenerator () {
    const module0 = fetchCompile(new URL('./iter-tpl.core.wasm', import.meta.url));
    const module1 = base64Compile('AGFzbQEAAAABWwxgAX8AYAN/fn8AYAJ/fwBgBH9/f38AYAJ+fwBgCH9/f39/f39/AGAHf39/f39/fwBgBH9+fn8AYAd/f39/f39/AGAFf39/f38AYAZ/f39/f38AYAV/f39+fwADGRgAAAABAgMABAMFBgcCAwMIAgkKAgMLAgAEBQFwARgYB3oZATAAAAExAAEBMgACATMAAwE0AAQBNQAFATYABgE3AAcBOAAIATkACQIxMAAKAjExAAsCMTIADAIxMwANAjE0AA4CMTUADwIxNgAQAjE3ABECMTgAEgIxOQATAjIwABQCMjEAFQIyMgAWAjIzABcIJGltcG9ydHMBAArlAhgJACAAQQARAAALCQAgAEEBEQAACwkAIABBAhEAAAsNACAAIAEgAkEDEQEACwsAIAAgAUEEEQIACw8AIAAgASACIANBBREDAAsJACAAQQYRAAALCwAgACABQQcRBAALDwAgACABIAIgA0EIEQMACxcAIAAgASACIAMgBCAFIAYgB0EJEQUACxUAIAAgASACIAMgBCAFIAZBChEGAAsPACAAIAEgAiADQQsRBwALCwAgACABQQwRAgALDwAgACABIAIgA0ENEQMACw8AIAAgASACIANBDhEDAAsVACAAIAEgAiADIAQgBSAGQQ8RCAALCwAgACABQRARAgALEQAgACABIAIgAyAEQRERCQALEwAgACABIAIgAyAEIAVBEhEKAAsLACAAIAFBExECAAsPACAAIAEgAiADQRQRAwALEQAgACABIAIgAyAEQRURCwALCwAgACABQRYRAgALCQAgAEEXEQAACwAvCXByb2R1Y2VycwEMcHJvY2Vzc2VkLWJ5AQ13aXQtY29tcG9uZW50BzAuMjQwLjA');
    const module2 = base64Compile('AGFzbQEAAAABWwxgAX8AYAN/fn8AYAJ/fwBgBH9/f38AYAJ+fwBgCH9/f39/f39/AGAHf39/f39/fwBgBH9+fn8AYAd/f39/f39/AGAFf39/f38AYAZ/f39/f38AYAV/f39+fwAClgEZAAEwAAAAATEAAAABMgAAAAEzAAEAATQAAgABNQADAAE2AAAAATcABAABOAADAAE5AAUAAjEwAAYAAjExAAcAAjEyAAIAAjEzAAMAAjE0AAMAAjE1AAgAAjE2AAIAAjE3AAkAAjE4AAoAAjE5AAIAAjIwAAMAAjIxAAsAAjIyAAIAAjIzAAAACCRpbXBvcnRzAXABGBgJHgEAQQALGAABAgMEBQYHCAkKCwwNDg8QERITFBUWFwAvCXByb2R1Y2VycwEMcHJvY2Vzc2VkLWJ5AQ13aXQtY29tcG9uZW50BzAuMjQwLjA');
    const module3 = base64Compile('AGFzbQEAAAABBAFgAAACBQEAAAAACAEA');
    const module4 = fetchCompile(new URL('./iter-tpl.core2.wasm', import.meta.url));
    const module5 = fetchCompile(new URL('./iter-tpl.core3.wasm', import.meta.url));
    const module6 = base64Compile('AGFzbQEAAAABDgJgAn9/AX9gA39/fwF/AwMCAAEHLwIQX19tYWluX2FyZ2NfYXJndgAAGF9fY3hhX3RocmVhZF9hdGV4aXRfaW1wbAABCgkCAwAACwMAAAsALwlwcm9kdWNlcnMBDHByb2Nlc3NlZC1ieQENd2l0LWNvbXBvbmVudAcwLjIzOS4wABsEbmFtZQAUE3dpdC1jb21wb25lbnQ6c3R1YnM');
    const module7 = fetchCompile(new URL('./iter-tpl.core4.wasm', import.meta.url));
    const module8 = fetchCompile(new URL('./iter-tpl.core5.wasm', import.meta.url));
    const module9 = fetchCompile(new URL('./iter-tpl.core6.wasm', import.meta.url));
    const module10 = fetchCompile(new URL('./iter-tpl.core7.wasm', import.meta.url));
    const module11 = base64Compile('AGFzbQEAAAAAMAhkeWxpbmsuMAEEAAAEAAIfAR1saWJjb21wb25lbnRpemVfcHlfcnVudGltZS5zbwGUAitgB39/f39/f38AYAJ/fwF/YAN/f38AYAJ/fwF/YAJ/fwF/YAJ/fwF/YAJ/fwF+YAJ/fwF+YAJ/fwF9YAJ/fwF8YAJ/fwF/YAN/f38AYAR/f39/AX9gAn9/AX9gA39/fwF/YAJ/fwF/YAJ/fwF/YAJ/fwF/YAJ/fgF/YAJ/fgF/YAJ/fQF/YAJ/fAF/YAJ/fwF/YAN/f38Bf2ABfwF/YAN/f38AYAF/AX9gBH9/f38Bf2AEf39/fwBgA39/fwF/YAV/f39/fwF/YAV/f39/fwF/YAR/f39/AX9gA39/fwF/YAN/f38AYAN/f38AYAF/AGADf39/AX9gA39/fwBgA39/fwBgAX8AYAR/f39/AGADf39/AAKdCSUDZW52GGNvbXBvbmVudGl6ZS1weSNEaXNwYXRjaAAAA2Vudhhjb21wb25lbnRpemUtcHkjQWxsb2NhdGUAAQNlbnYUY29tcG9uZW50aXplLXB5I0ZyZWUAAgNlbnYbY29tcG9uZW50aXplLXB5I1RvQ2Fub25Cb29sAAMDZW52GmNvbXBvbmVudGl6ZS1weSNUb0Nhbm9uSTMyAAQDZW52GmNvbXBvbmVudGl6ZS1weSNUb0Nhbm9uVTMyAAUDZW52GmNvbXBvbmVudGl6ZS1weSNUb0Nhbm9uSTY0AAYDZW52GmNvbXBvbmVudGl6ZS1weSNUb0Nhbm9uVTY0AAcDZW52GmNvbXBvbmVudGl6ZS1weSNUb0Nhbm9uRjMyAAgDZW52GmNvbXBvbmVudGl6ZS1weSNUb0Nhbm9uRjY0AAkDZW52G2NvbXBvbmVudGl6ZS1weSNUb0Nhbm9uQ2hhcgAKA2Vudh1jb21wb25lbnRpemUtcHkjVG9DYW5vblN0cmluZwALA2Vudhhjb21wb25lbnRpemUtcHkjR2V0RmllbGQADANlbnYdY29tcG9uZW50aXplLXB5I0dldExpc3RMZW5ndGgADQNlbnYeY29tcG9uZW50aXplLXB5I0dldExpc3RFbGVtZW50AA4DZW52HWNvbXBvbmVudGl6ZS1weSNGcm9tQ2Fub25Cb29sAA8DZW52HGNvbXBvbmVudGl6ZS1weSNGcm9tQ2Fub25JMzIAEANlbnYcY29tcG9uZW50aXplLXB5I0Zyb21DYW5vblUzMgARA2Vudhxjb21wb25lbnRpemUtcHkjRnJvbUNhbm9uSTY0ABIDZW52HGNvbXBvbmVudGl6ZS1weSNGcm9tQ2Fub25VNjQAEwNlbnYcY29tcG9uZW50aXplLXB5I0Zyb21DYW5vbkYzMgAUA2Vudhxjb21wb25lbnRpemUtcHkjRnJvbUNhbm9uRjY0ABUDZW52HWNvbXBvbmVudGl6ZS1weSNGcm9tQ2Fub25DaGFyABYDZW52H2NvbXBvbmVudGl6ZS1weSNGcm9tQ2Fub25TdHJpbmcAFwNlbnYYY29tcG9uZW50aXplLXB5I01ha2VMaXN0ABgDZW52GmNvbXBvbmVudGl6ZS1weSNMaXN0QXBwZW5kABkDZW52FGNvbXBvbmVudGl6ZS1weSNOb25lABoDZW52FGNvbXBvbmVudGl6ZS1weSNJbml0ABsDZW52GGNvbXBvbmVudGl6ZS1weSNHZXRCeXRlcwAcA2Vudhljb21wb25lbnRpemUtcHkjTWFrZUJ5dGVzAB0DZW52H2NvbXBvbmVudGl6ZS1weSNGcm9tQ2Fub25IYW5kbGUAHgNlbnYdY29tcG9uZW50aXplLXB5I1RvQ2Fub25IYW5kbGUAHwNlbnYMY2FiaV9yZWFsbG9jACADZW52DF9fdGFibGVfYmFzZQN/AANlbnYPX19zdGFja19wb2ludGVyA38BA2VudgZtZW1vcnkCAAADZW52GV9faW5kaXJlY3RfZnVuY3Rpb25fdGFibGUBcAAEAwoJISIjJCUmJygpB4QCByZpdGVyLXRwbDppdGVyL3Rvb2xzQDAuMC4xI2NvbWJpbmF0aW9ucwAhMGNhYmlfcG9zdF9pdGVyLXRwbDppdGVyL3Rvb2xzQDAuMC4xI2NvbWJpbmF0aW9ucwAkJml0ZXItdHBsOml0ZXIvdG9vbHNAMC4wLjEjcGVybXV0YXRpb25zACUwY2FiaV9wb3N0X2l0ZXItdHBsOml0ZXIvdG9vbHNAMC4wLjEjcGVybXV0YXRpb25zACgcY29tcG9uZW50aXplLXB5I0NhbGxJbmRpcmVjdAApE2NhYmlfaW1wb3J0X3JlYWxsb2MAIBNjYWJpX2V4cG9ydF9yZWFsbG9jACAJDAECACMACwAEIiMmJwrQCAlRAQJ/QQBBAEEBQQJBACMBQRBrJAEjASEDIANBAGohBCAEIAA2AgAgBCABNgIEIANBCGohBCAEIAI2AgAjAUEIQQQQASIDEAAgAyMBQRBqJAELdQEGfyABQQBqIQMgAiADKAIAIQQgAygCBCEFIAAQGCEIQQAhBgNAIAYgBUcEQCAEIAZBCGxqIQcgACAIIAAgBygCACAHKAIEEBcQGSAGQQFqIQYMAQsLIAg2AgAgAUEIaiEDIAIgAygCACEEIAAgBBARNgIEC7wBAQ5/IAEoAgAhAyACQQBqIQQgBCAAIAMQDSEGIAZBCGxBBBABIQdBACEIA0AgCCAGRwRAIAAgAyAIEA4hCSAHIAhBCGxqIQogCiAAIAkQDSEMIAxBCGxBBBABIQ1BACEOA0AgDiAMRwRAIAAgCSAOEA4hDyANIA5BCGxqIRAgACAPIBAQCyAOQQFqIQ4MAQsLIA0gDCELNgIAIAogCzYCBCAIQQFqIQgMAQsLIAcgBiEFNgIAIAQgBTYCBAuXAQEJfyAAQQBqIQEgASgCACECIAEoAgQhA0EAIQQDQCAEIANHBEAgAiAEQQhsaiEFIAUoAgAhBiAFKAIEIQdBACEIA0AgCCAHRwRAIAYgCEEIbGohCSAJKAIAIAkoAgRBARACIAhBAWohCAwBCwsgBiAHQQhsQQQQAiAEQQFqIQQMAQsLIAIgA0EIbEEEEAIgAEEIQQQQAgtRAQJ/QQFBAkEDQQJBACMBQRBrJAEjASEDIANBAGohBCAEIAA2AgAgBCABNgIEIANBCGohBCAEIAI2AgAjAUEIQQQQASIDEAAgAyMBQRBqJAELdQEGfyABQQBqIQMgAiADKAIAIQQgAygCBCEFIAAQGCEIQQAhBgNAIAYgBUcEQCAEIAZBCGxqIQcgACAIIAAgBygCACAHKAIEEBcQGSAGQQFqIQYMAQsLIAg2AgAgAUEIaiEDIAIgAygCACEEIAAgBBARNgIEC7wBAQ5/IAEoAgAhAyACQQBqIQQgBCAAIAMQDSEGIAZBCGxBBBABIQdBACEIA0AgCCAGRwRAIAAgAyAIEA4hCSAHIAhBCGxqIQogCiAAIAkQDSEMIAxBCGxBBBABIQ1BACEOA0AgDiAMRwRAIAAgCSAOEA4hDyANIA5BCGxqIRAgACAPIBAQCyAOQQFqIQ4MAQsLIA0gDCELNgIAIAogCzYCBCAIQQFqIQgMAQsLIAcgBiEFNgIAIAQgBTYCBAuXAQEJfyAAQQBqIQEgASgCACECIAEoAgQhA0EAIQQDQCAEIANHBEAgAiAEQQhsaiEFIAUoAgAhBiAFKAIEIQdBACEIA0AgCCAHRwRAIAYgCEEIbGohCSAJKAIAIAkoAgRBARACIAhBAWohCAwBCwsgBiAHQQhsQQQQAiAEQQFqIQQMAQsLIAIgA0EIbEEEEAIgAEEIQQQQAgsQACAAIAEgAiADIwBqESoACwCUCwRuYW1lAB8ebGliY29tcG9uZW50aXplX3B5X2JpbmRpbmdzLnNvAckKKgAYY29tcG9uZW50aXplLXB5I0Rpc3BhdGNoARhjb21wb25lbnRpemUtcHkjQWxsb2NhdGUCFGNvbXBvbmVudGl6ZS1weSNGcmVlAxtjb21wb25lbnRpemUtcHkjVG9DYW5vbkJvb2wEGmNvbXBvbmVudGl6ZS1weSNUb0Nhbm9uSTMyBRpjb21wb25lbnRpemUtcHkjVG9DYW5vblUzMgYaY29tcG9uZW50aXplLXB5I1RvQ2Fub25JNjQHGmNvbXBvbmVudGl6ZS1weSNUb0Nhbm9uVTY0CBpjb21wb25lbnRpemUtcHkjVG9DYW5vbkYzMgkaY29tcG9uZW50aXplLXB5I1RvQ2Fub25GNjQKG2NvbXBvbmVudGl6ZS1weSNUb0Nhbm9uQ2hhcgsdY29tcG9uZW50aXplLXB5I1RvQ2Fub25TdHJpbmcMGGNvbXBvbmVudGl6ZS1weSNHZXRGaWVsZA0dY29tcG9uZW50aXplLXB5I0dldExpc3RMZW5ndGgOHmNvbXBvbmVudGl6ZS1weSNHZXRMaXN0RWxlbWVudA8dY29tcG9uZW50aXplLXB5I0Zyb21DYW5vbkJvb2wQHGNvbXBvbmVudGl6ZS1weSNGcm9tQ2Fub25JMzIRHGNvbXBvbmVudGl6ZS1weSNGcm9tQ2Fub25VMzISHGNvbXBvbmVudGl6ZS1weSNGcm9tQ2Fub25JNjQTHGNvbXBvbmVudGl6ZS1weSNGcm9tQ2Fub25VNjQUHGNvbXBvbmVudGl6ZS1weSNGcm9tQ2Fub25GMzIVHGNvbXBvbmVudGl6ZS1weSNGcm9tQ2Fub25GNjQWHWNvbXBvbmVudGl6ZS1weSNGcm9tQ2Fub25DaGFyFx9jb21wb25lbnRpemUtcHkjRnJvbUNhbm9uU3RyaW5nGBhjb21wb25lbnRpemUtcHkjTWFrZUxpc3QZGmNvbXBvbmVudGl6ZS1weSNMaXN0QXBwZW5kGhRjb21wb25lbnRpemUtcHkjTm9uZRsUY29tcG9uZW50aXplLXB5I0luaXQcGGNvbXBvbmVudGl6ZS1weSNHZXRCeXRlcx0ZY29tcG9uZW50aXplLXB5I01ha2VCeXRlcx4fY29tcG9uZW50aXplLXB5I0Zyb21DYW5vbkhhbmRsZR8dY29tcG9uZW50aXplLXB5I1RvQ2Fub25IYW5kbGUgDGNhYmlfcmVhbGxvYyEtaXRlci10cGw6aXRlci90b29sc0AwLjAuMSNjb21iaW5hdGlvbnMtZXhwb3J0IjFpdGVyLXRwbDppdGVyL3Rvb2xzQDAuMC4xI2NvbWJpbmF0aW9ucy1mcm9tLWNhbm9uIy9pdGVyLXRwbDppdGVyL3Rvb2xzQDAuMC4xI2NvbWJpbmF0aW9ucy10by1jYW5vbiQyaXRlci10cGw6aXRlci90b29sc0AwLjAuMSNjb21iaW5hdGlvbnMtcG9zdC1yZXR1cm4lLWl0ZXItdHBsOml0ZXIvdG9vbHNAMC4wLjEjcGVybXV0YXRpb25zLWV4cG9ydCYxaXRlci10cGw6aXRlci90b29sc0AwLjAuMSNwZXJtdXRhdGlvbnMtZnJvbS1jYW5vbicvaXRlci10cGw6aXRlci90b29sc0AwLjAuMSNwZXJtdXRhdGlvbnMtdG8tY2Fub24oMml0ZXItdHBsOml0ZXIvdG9vbHNAMC4wLjEjcGVybXV0YXRpb25zLXBvc3QtcmV0dXJuKRxjb21wb25lbnRpemUtcHkjQ2FsbEluZGlyZWN0ByACAAxfX3RhYmxlX2Jhc2UBD19fc3RhY2tfcG9pbnRlcg');
    const module12 = base64Compile('AGFzbQEAAAAAGghkeWxpbmsuMAEEBAIAAAIJAQdsaWJjLnNvAQgCYAAAYAABfwJaBANlbnYGbWVtb3J5AgABA2VudhlfX2luZGlyZWN0X2Z1bmN0aW9uX3RhYmxlAXAAAANlbnYNX19tZW1vcnlfYmFzZQN/AANlbnYMX190YWJsZV9iYXNlA38AAwQDAAABBxgCC19pbml0aWFsaXplAAEGZ2V0cGlkAAIKOwMCAAsxAAJAI4CAgIAAQYCAgIAAaigCAEUNAAALI4CAgIAAQYCAgIAAakEBNgIAEICAgIAACwQAQSoLAL0BDS5kZWJ1Z19hYmJyZXYBEQElDhMFAw4QFxsOEQESBgAAAi4BEQESBkAYl0IZAw46CzsLJxk/GQAAAzQAAw5JEzoLOwsCGAAABImCAQAxExEBAAAFNQBJEwAABiQAAw4+CwsLAAAHLgADDjoLOwsnGTwZPxkAAAABEQElDhMFAw4QFxsOEQESBgAAAi4AEQESBkAYl0IZAw46CzsLJxlJEz8ZAAADFgBJEwMOOgs7BQAABCQAAw4+CwsLAAAAANQBCy5kZWJ1Z19pbmZvbwAAAAQAAAAAAAQBtgAAAB0AOwAAAAAAAACAAAAABQAAADEAAAACBQAAADEAAAAH7QP/////nxwAAAABCAMvAAAAXwAAAAESDO0DAAAAAAMAAAAAIgRrAAAANQAAAAAFZAAAAAYAAAAABQQHCgAAAAEFAFEAAAAEAGkAAAAEAbYAAAAdAF8AAABxAAAAgAAAADcAAAAEAAAAAjcAAAAEAAAAB+0D/////58oAAAAAQNBAAAAA00AAAAEAAAAAhIBBAAAAAAFBAAArwIKLmRlYnVnX3N0cmludABwaWRfdABfX3dhc21fY2FsbF9jdG9ycwBfaW5pdGlhbGl6ZQBnZXRwaWQAaW5pdGlhbGl6ZWQAbGliYy1ib3R0b20taGFsZi9jcnQvY3J0MS1yZWFjdG9yLmMAbGliYy1ib3R0b20taGFsZi9nZXRwaWQvZ2V0cGlkLmMAd2FzaXNkazovL3YyNy4wL2J1aWxkL3N5c3Jvb3Qvd2FzaS1saWJjLXdhc20zMi13YXNpcDIAY2xhbmcgdmVyc2lvbiAyMC4xLjgtd2FzaS1zZGsgKGh0dHBzOi8vZ2l0aHViLmNvbS9sbHZtL2xsdm0tcHJvamVjdCA4N2YwMjI3Y2I2MDE0N2EyNmExZWViNGZiMDZlM2I1MDVlOWM3MjYxKQAAsgILLmRlYnVnX2xpbmVtAAAABAA7AAAAAQEB+w4NAAEBAQEAAAABAAABbGliYy1ib3R0b20taGFsZi9jcnQAAGNydDEtcmVhY3Rvci5jAAEAAAAFCQoABQIGAAAAAxIBBRUGCCAFCQY9BgNsIAURBgMWIAUFCCQFAWcCAQABAbEAAAAEAJoAAAABAQH7Dg0AAQEBAQAAAAEAAAFsaWJjLWJvdHRvbS1oYWxmL2dldHBpZAB3YXNpc2RrOi8vdjI3LjAvYnVpbGQvc3lzcm9vdC9pbnN0YWxsL3NoYXJlL3dhc2ktc3lzcm9vdC9pbmNsdWRlL3dhc20zMi13YXNpcDIvYml0cwAAZ2V0cGlkLmMAAQAAYWxsdHlwZXMuaAACAAAAAAUCNwAAABQFBQo+AgEAAQEAdgRuYW1lABsabGlid2FzaS1lbXVsYXRlZC1nZXRwaWQuc28BKQMAEV9fd2FzbV9jYWxsX2N0b3JzAQtfaW5pdGlhbGl6ZQIGZ2V0cGlkBx4CAA1fX21lbW9yeV9iYXNlAQxfX3RhYmxlX2Jhc2UJBwEABC5ic3MAjgEJcHJvZHVjZXJzAghsYW5ndWFnZQEDQzExAAxwcm9jZXNzZWQtYnkBBWNsYW5nXzIwLjEuOC13YXNpLXNkayAoaHR0cHM6Ly9naXRodWIuY29tL2xsdm0vbGx2bS1wcm9qZWN0IDg3ZjAyMjdjYjYwMTQ3YTI2YTFlZWI0ZmIwNmUzYjUwNWU5YzcyNjEpAIYBD3RhcmdldF9mZWF0dXJlcwcrD2J1bGstbWVtb3J5LW9wdCsWY2FsbC1pbmRpcmVjdC1vdmVybG9uZysOZXh0ZW5kZWQtY29uc3QrCm11bHRpdmFsdWUrD211dGFibGUtZ2xvYmFscysTbm9udHJhcHBpbmctZnB0b2ludCsIc2lnbi1leHQ');
    const module13 = fetchCompile(new URL('./iter-tpl.core8.wasm', import.meta.url));
    const module14 = base64Compile('AGFzbQEAAAAAGwhkeWxpbmsuMAEFmAECAAACCQEHbGliYy5zbwEeBmABfwF/YAN/f38Bf2AAAGAAAX9gAn9/AX9gAX8AAnQGA2VudgZtZW1vcnkCAAEDZW52GV9faW5kaXJlY3RfZnVuY3Rpb25fdGFibGUBcAAAA2Vudg1fX21lbW9yeV9iYXNlA38AA2VudgxfX3RhYmxlX2Jhc2UDfwADZW52BnN0cmxlbgAAA2VudgZtZW1jbXAAAQMKCQICAgACAwQEBQdmBxhfX3dhc21fYXBwbHlfZGF0YV9yZWxvY3MAAwtfaW5pdGlhbGl6ZQAEB2RsY2xvc2UABQdkbGVycm9yAAcGZGxvcGVuAAgFZGxzeW0ACRRfX3dhc21fc2V0X2xpYnJhcmllcwAKCtkGCQIACwIACzIAAkAjgICAgABBjIGAgABqKAIARQ0AAAALI4CAgIAAQYyBgIAAakEBNgIAEIKAgIAAC3QBA38CQCOAgICAAEGUgYCAAGooAgAiAUUNACABKAIAQQFqIQJBcCEDAkADQCACQX9qIgJFDQEgASgCBCADQRBqIgNqIABHDQALQQAPCyOAgICAACICQZCBgIAAaiACQYCAgIAAajYCAEF/DwsQhoCAgAAACwQAAAALIQECfyOAgICAAEGQgYCAAGoiACgCACEBIABBADYCACABC5YCAQd/AkAjgICAgABBlIGAgABqKAIAIgJFDQAjgICAgAAhAwJAAkACQCABQfx9cUUNACADQamAgIAAaiEBDAELI4CAgIAAIQEgABCAgICAACEDAkAgAigCACIEDQAgAUGXgICAAGohAQwBCyACKAIEIQVBACEBIAQhAgNAIAUgBEEBdiABaiIGQQR0aiIHQQRqKAIAIAAgBygCACIEIAMgBCADSRsQgYCAgAAiCCAEIANrIAgbIgRFDQIgBiACIARBAEobIgIgBkEBaiABIARBAEgbIgFrIQQjgICAgAAhBiACIAFLDQALIAZBl4CAgABqIQELI4CAgIAAQZCBgIAAaiABNgIAQQAhBwsgBw8LEIaAgIAAAAvUAgEGfwJAIABBAWpBAUsNACOAgICAACICQZCBgIAAaiACQdmAgIAAajYCAEEADwsCQAJAI4CAgIAAQZSBgIAAaigCACIDRQ0AIAMoAgBBAWohAkFwIQQDQCACQX9qIgJFDQIgAygCBCAEQRBqIgRqIABHDQALIAEQgICAgAAhBAJAAkAgACgCCCIDRQ0AIAAoAgwhBUEAIQIgAyEGA0AgBSADQQF2IAJqIgNBDGxqIgBBBGooAgAgASAAKAIAIgAgBCAAIARJGxCBgICAACIHIAAgBGsgBxsiAEUNAiADIAYgAEEAShsiBiADQQFqIAIgAEEASBsiAmshAyAGIAJLDQALCyOAgICAACICQZCBgIAAaiACQciAgIAAajYCAEEADwsgBSADQQxsaigCCA8LEIaAgIAAAAsjgICAgAAiAkGQgYCAAGogAkGAgICAAGo2AgBBAAsUACOAgICAAEGUgYCAAGogADYCAAsAEARuYW1lAAkIbGliZGwuc28');
    const module15 = fetchCompile(new URL('./iter-tpl.core9.wasm', import.meta.url));
    const module16 = fetchCompile(new URL('./iter-tpl.core10.wasm', import.meta.url));
    const module17 = base64Compile('AGFzbQEAAAABqQIlYAJ/fwF/YAN/fn8Bf2AEf35+fwF/YAN/fn4Bf2ABfwF/YAJ/fgF/YAV/f39+fwF/YAN/f38Bf2AEf39/fwF/YAR/fn9/AX9gBX9/f39/AX9gB39/f39+fn8Bf2AHf39/f39/fwF/YAl/f39/f35+f38Bf2AGf39/f39/AX9gAX8AYAAAYAABf2ABfwBgBX9+fn9/AGACf38AYAN/fn8AYAV/f39+fwBgBH9/f38AYAd/f39/f39/AGAGf39/f39/AGAIf39+f39+f38AYAR/fn5/AGAFf39/f38AYAt/f39/f35/f35/fwBgCH9/f39/f39/AGAHf39/f39/fwBgA39/fwBgAn5/AGAEf39+fwBgD39/f39/f39/f39/f39/fwBgA39/fwAC7AnCAQABMAAAAAExAAAAATIAAAABMwABAAE0AAAAATUAAAABNgACAAE3AAMAATgABAABOQAEAAIxMAAAAAIxMQAAAAIxMgADAAIxMwAAAAIxNAAFAAIxNQACAAIxNgAGAAIxNwAHAAIxOAAAAAIxOQAGAAIyMAAIAAIyMQAGAAIyMgAAAAIyMwAJAAIyNAAEAAIyNQAAAAIyNgAIAAIyNwAHAAIyOAAKAAIyOQALAAIzMAAMAAIzMQANAAIzMgAOAAIzMwAHAAIzNAAOAAIzNQAKAAIzNgAHAAIzNwAIAAIzOAAPAAIzOQAEAAI0MAAAAAI0MQAQAAI0MgARAAI0MwAHAAI0NAAOAAI0NQAKAAI0NgAAAAI0NwAEAAI0OAAEAAI0OQASAAI1MAASAAI1MQASAAI1MgATAAI1MwAUAAI1NAAUAAI1NQAVAAI1NgAWAAI1NwAUAAI1OAAUAAI1OQAUAAI2MAAXAAI2MQAXAAI2MgAYAAI2MwAZAAI2NAAXAAI2NQAVAAI2NgAVAAI2NwAUAAI2OAAUAAI2OQAaAAI3MAAbAAI3MQAUAAI3MgAcAAI3MwAdAAI3NAAeAAI3NQAfAAI3NgAXAAI3NwAUAAI3OAAcAAI3OQAUAAI4MAAVAAI4MQAVAAI4MgAUAAI4MwAXAAI4NAAXAAI4NQAUAAI4NgAgAAI4NwAhAAI4OAASAAI4OQASAAI5MAASAAI5MQASAAI5MgASAAI5MwASAAI5NAASAAI5NQAUAAI5NgAgAAI5NwAVAAI5OAAVAAI5OQAVAAMxMDAAFQADMTAxABQAAzEwMgAXAAMxMDMAFwADMTA0ABQAAzEwNQAUAAMxMDYAFQADMTA3ABUAAzEwOAAiAAMxMDkAIgADMTEwABUAAzExMQAVAAMxMTIAFAADMTEzABMAAzExNAAUAAMxMTUAFAADMTE2ABQAAzExNwAVAAMxMTgAGgADMTE5ABsAAzEyMAAWAAMxMjEAFAADMTIyABQAAzEyMwAXAAMxMjQAFAADMTI1ABwAAzEyNgAdAAMxMjcAHgADMTI4AB8AAzEyOQAXAAMxMzAAFwADMTMxABgAAzEzMgAZAAMxMzMAFwADMTM0ABQAAzEzNQAcAAMxMzYAFAADMTM3ABQAAzEzOAAjAAMxMzkAFAADMTQwACMAAzE0MQAUAAMxNDIAFAADMTQzABQAAzE0NAAkAAMxNDUAFAADMTQ2ABUAAzE0NwAUAAMxNDgAFQADMTQ5ABUAAzE1MAAUAAMxNTEAFwADMTUyACMAAzE1MwAUAAMxNTQAIwADMTU1ABQAAzE1NgAUAAMxNTcAFAADMTU4ABQAAzE1OQAUAAMxNjAAFAADMTYxABUAAzE2MgAUAAMxNjMAJAADMTY0ABQAAzE2NQAVAAMxNjYAFAADMTY3ABUAAzE2OAAUAAMxNjkAJAADMTcwABQAAzE3MQAkAAMxNzIAFAADMTczABUAAzE3NAAUAAMxNzUAFQADMTc2ACQAAzE3NwAXAAMxNzgAFAADMTc5ABIAAzE4MAASAAMxODEAEgADMTgyABIAAzE4MwASAAMxODQAEgADMTg1ABIAAzE4NgASAAMxODcAEgADMTg4ABQAAzE4OQAUAAMxOTAAIQADMTkxACEAAzE5MgASAAgkaW1wb3J0cwFwAcEBwQEJiQIBAEEAC8EBAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AAYEBggGDAYQBhQGGAYcBiAGJAYoBiwGMAY0BjgGPAZABkQGSAZMBlAGVAZYBlwGYAZkBmgGbAZwBnQGeAZ8BoAGhAaIBowGkAaUBpgGnAagBqQGqAasBrAGtAa4BrwGwAbEBsgGzAbQBtQG2AbcBuAG5AboBuwG8Ab0BvgG/AcABAC8JcHJvZHVjZXJzAQxwcm9jZXNzZWQtYnkBDXdpdC1jb21wb25lbnQHMC4yMzkuMAAcBG5hbWUAFRR3aXQtY29tcG9uZW50OmZpeHVwcw');
    const module18 = fetchCompile(new URL('./iter-tpl.core11.wasm', import.meta.url));
    const module19 = base64Compile('AGFzbQEAAAABEAJgBH9/f38AYAV/f39/fwADBAMAAAEEBQFwAQMDBxgEATAAAAExAAEBMgACCCRpbXBvcnRzAQAKMwMPACAAIAEgAiADQQARAAALDwAgACABIAIgA0EBEQAACxEAIAAgASACIAMgBEECEQEACwAvCXByb2R1Y2VycwEMcHJvY2Vzc2VkLWJ5AQ13aXQtY29tcG9uZW50BzAuMjQwLjA');
    const module20 = base64Compile('AGFzbQEAAAABEAJgBH9/f38AYAV/f39/fwACHwQAATAAAAABMQAAAAEyAAEACCRpbXBvcnRzAXABAwMJCQEAQQALAwABAgAvCXByb2R1Y2VycwEMcHJvY2Vzc2VkLWJ5AQ13aXQtY29tcG9uZW50BzAuMjQwLjA');
    const module21 = base64Compile('AGFzbQEAAAABVQ5gBH9/f38Bf2ADf39/AX9gAX8AYAR/f39/AGADf39/AGAFf39/f38AYAABf2ACf38Bf2ADf39/AGAAAX9gA39/fwBgAn9/AX9gA39/fwBgAn9/AX8CvgQYBWZsYWdzCWluc3RhbmNlMwN/AQZtZW1vcnkCbTACAAAHcmVhbGxvYwJmMAAABWZsYWdzCWluc3RhbmNlNgN/AQdyZWFsbG9jAmYxAAAGY2FsbGVlCGFkYXB0ZXIwAAELcG9zdF9yZXR1cm4IYWRhcHRlcjAAAgl0cmFuc2NvZGUbdXRmOC10by11dGY4IChtZW0xID0+IG1lbTApAAQJdHJhbnNjb2RlG3V0ZjgtdG8tdXRmOCAobWVtMCA9PiBtZW0xKQAEBmNhbGxlZQhhZGFwdGVyMQABC3Bvc3RfcmV0dXJuCGFkYXB0ZXIxAAIFZmxhZ3MJaW5zdGFuY2UxA38BB3JlYWxsb2MCZjgAAAZjYWxsZWUIYWRhcHRlcjIAAAl0cmFuc2NvZGUbdXRmOC10by11dGY4IChtZW0xID0+IG1lbTIpAAQJdHJhbnNjb2RlG3V0ZjgtdG8tdXRmOCAobWVtMiA9PiBtZW0xKQAECGF1Z21lbnRzD21lbTEgTWVtb3J5U2l6ZQAGCGF1Z21lbnRzDG1lbTEgSTMyTG9hZAAHCGF1Z21lbnRzDW1lbTEgSTMyU3RvcmUACAhhdWdtZW50cw9tZW0yIE1lbW9yeVNpemUACQhhdWdtZW50cw1tZW0yIEkzMlN0b3JlAAoIYXVnbWVudHMObWVtMiBJMzJMb2FkOFUACwhhdWdtZW50cw5tZW0xIEkzMlN0b3JlOAAMCGF1Z21lbnRzDG1lbTIgSTMyTG9hZAANAwQDAwMFByIDCGFkYXB0ZXIwABQIYWRhcHRlcjEAFQhhZGFwdGVyMgAWCpMTA9IGAwJ/AX4QfyMBQQFxRQRAAAsjAEECcUUEQAALIwBBfXEkACMAQX5xJAAgACABIQQhBSAFQQNxBEAACwJAAkAgBK1CCH4iBkIgiFANAQsACyAGpyEHIAchCEEAQQBBBCAIEAAhCSAJQQNxBEAACwJAAkAQDK1CEIYgBa0gB618Wg0BCwALAkACQD8ArUIQhiAJrSAIrXxaDQELAAsCQCAEIghFDQAgBSEHIAkhCgNAIAdBABANIAdBBBANIQshDCALQYCAgIB4TwRAAAsgCyINIQ5BAEEAQQEgDhAAIQ8CQAJAEAytQhCGIAytIAutfFoNAQsACwJAAkA/AK1CEIYgD60gDq18Wg0BCwALIAwgCyAPEAQgCiAPNgIAIAogDTYCBCAHQQhqIQcgCkEIaiEKIAhBf2oiCA0ACwsgCSAEIAIjAEEBciQAEAIhCSMBQX5xJAEgCUEDcQRAAAsgA0EDcQRAAAsgCSgCACAJKAIEIQUhBCAEQQNxBEAACwJAAkAgBa1CCH4iBkIgiFANAQsACyAGpyEIIAghB0EAQQBBBCAHEAEhCiAKQQNxBEAACwJAAkA/AK1CEIYgBK0gCK18Wg0BCwALAkACQBAMrUIQhiAKrSAHrXxaDQELAAsCQCAFIgdFDQAgBCEIIAohDQNAIAgoAgAgCCgCBCEPIQsgC0EDcQRAAAsCQAJAIA+tQgh+IgZCIIhQDQELAAsgBqchDCAMIQ5BAEEAQQQgDhABIRAgEEEDcQRAAAsCQAJAPwCtQhCGIAutIAytfFoNAQsACwJAAkAQDK1CEIYgEK0gDq18Wg0BCwALAkAgDyIORQ0AIAshDCAQIREDQCAMKAIAIAwoAgQhEiETIBJBgICAgHhPBEAACyASIhQhFUEAQQBBASAVEAEhFgJAAkA/AK1CEIYgE60gEq18Wg0BCwALAkACQBAMrUIQhiAWrSAVrXxaDQELAAsgEyASIBYQBSARIBZBABAOIBEgFEEEEA4gDEEIaiEMIBFBCGohESAOQX9qIg4NAAsLIA0gEEEAEA4gDSAPQQQQDiAIQQhqIQggDUEIaiENIAdBf2oiBw0ACwsgAyAKQQAQDiADIAVBBBAOIwFBAXIkASAJEAMjAEECciQAC9IGAwJ/AX4QfyMBQQFxRQRAAAsjAEECcUUEQAALIwBBfXEkACMAQX5xJAAgACABIQQhBSAFQQNxBEAACwJAAkAgBK1CCH4iBkIgiFANAQsACyAGpyEHIAchCEEAQQBBBCAIEAAhCSAJQQNxBEAACwJAAkAQDK1CEIYgBa0gB618Wg0BCwALAkACQD8ArUIQhiAJrSAIrXxaDQELAAsCQCAEIghFDQAgBSEHIAkhCgNAIAdBABANIAdBBBANIQshDCALQYCAgIB4TwRAAAsgCyINIQ5BAEEAQQEgDhAAIQ8CQAJAEAytQhCGIAytIAutfFoNAQsACwJAAkA/AK1CEIYgD60gDq18Wg0BCwALIAwgCyAPEAQgCiAPNgIAIAogDTYCBCAHQQhqIQcgCkEIaiEKIAhBf2oiCA0ACwsgCSAEIAIjAEEBciQAEAYhCSMBQX5xJAEgCUEDcQRAAAsgA0EDcQRAAAsgCSgCACAJKAIEIQUhBCAEQQNxBEAACwJAAkAgBa1CCH4iBkIgiFANAQsACyAGpyEIIAghB0EAQQBBBCAHEAEhCiAKQQNxBEAACwJAAkA/AK1CEIYgBK0gCK18Wg0BCwALAkACQBAMrUIQhiAKrSAHrXxaDQELAAsCQCAFIgdFDQAgBCEIIAohDQNAIAgoAgAgCCgCBCEPIQsgC0EDcQRAAAsCQAJAIA+tQgh+IgZCIIhQDQELAAsgBqchDCAMIQ5BAEEAQQQgDhABIRAgEEEDcQRAAAsCQAJAPwCtQhCGIAutIAytfFoNAQsACwJAAkAQDK1CEIYgEK0gDq18Wg0BCwALAkAgDyIORQ0AIAshDCAQIREDQCAMKAIAIAwoAgQhEiETIBJBgICAgHhPBEAACyASIhQhFUEAQQBBASAVEAEhFgJAAkA/AK1CEIYgE60gEq18Wg0BCwALAkACQBAMrUIQhiAWrSAVrXxaDQELAAsgEyASIBYQBSARIBZBABAOIBEgFEEEEA4gDEEIaiEMIBFBCGohESAOQX9qIg4NAAsLIA0gEEEAEA4gDSAPQQQQDiAIQQhqIQggDUEIaiENIAdBf2oiBw0ACwsgAyAKQQAQDiADIAVBBBAOIwFBAXIkASAJEAcjAEECciQAC+gFAwV/AX4GfyMBQQFxRQRAAAsjAkECcUUEQAALIwJBfXEkAiMCQX5xJAIgACABIQUhBiAFQYCAgIB4TwRAAAsgBSIHIQhBAEEAQQEgCBAIIQkCQAJAEAytQhCGIAatIAWtfFoNAQsACwJAAkAQD61CEIYgCa0gCK18Wg0BCwALIAYgBSAJEAogCSAHIAIgAyEHIQkgCUEDcQRAAAsCQAJAIAetQgh+IgpCIIhQDQELAAsgCqchBSAFIQZBAEEAQQQgBhAIIQggCEEDcQRAAAsCQAJAEAytQhCGIAmtIAWtfFoNAQsACwJAAkAQD61CEIYgCK0gBq18Wg0BCwALAkAgByIGRQ0AIAkhBSAIIQsDQCAFQQAQDSAFQQQQDSEMIQ0gDEGAgICAeE8EQAALIAwiDiEPQQBBAEEBIA8QCCEQAkACQBAMrUIQhiANrSAMrXxaDQELAAsCQAJAEA+tQhCGIBCtIA+tfFoNAQsACyANIAwgEBAKIAsgEEEAEBAgCyAOQQQQECAFQQhqIQUgC0EIaiELIAZBf2oiBg0ACwsgCCAHIwJBAXIkAhAJIQgjAUF+cSQBIAhBA3EEQAALIARBA3EEQAALAkACQAJAAkAgCEEAEBEOAgECAAsACyAEQQBBABASIAhBBBATIAhBCBATIQkhByAJQYCAgIB4TwRAAAsgCSIGIQVBAEEAQQEgBRABIQsCQAJAEA+tQhCGIAetIAmtfFoNAQsACwJAAkAQDK1CEIYgC60gBa18Wg0BCwALIAcgCSALEAsgBCALQQQQDiAEIAZBCBAODAELIARBAUEAEBIgCEEEEBMgCEEIEBMhBiELIAZBgICAgHhPBEAACyAGIgkhB0EAQQBBASAHEAEhBQJAAkAQD61CEIYgC60gBq18Wg0BCwALAkACQBAMrUIQhiAFrSAHrXxaDQELAAsgCyAGIAUQCyAEIAVBBBAOIAQgCUEIEA4LIwFBAXIkASMCQQJyJAIL');
    const instanceFlags1 = new WebAssembly.Global({ value: "i32", mutable: true }, 3);
    const instanceFlags3 = new WebAssembly.Global({ value: "i32", mutable: true }, 3);
    const instanceFlags6 = new WebAssembly.Global({ value: "i32", mutable: true }, 3);
    ({ exports: exports0 } = yield instantiateCore(yield module1));
    ({ exports: exports1 } = yield instantiateCore(yield module0, {
      'wasi:cli/environment@0.2.0': {
        'get-arguments': exports0['1'],
        'get-environment': exports0['0'],
        'initial-cwd': exports0['2'],
      },
      'wasi:cli/stderr@0.2.0': {
        'get-stderr': trampoline5,
      },
      'wasi:cli/stdin@0.2.0': {
        'get-stdin': trampoline6,
      },
      'wasi:cli/stdout@0.2.0': {
        'get-stdout': trampoline2,
      },
      'wasi:clocks/monotonic-clock@0.2.0': {
        now: trampoline3,
      },
      'wasi:clocks/wall-clock@0.2.0': {
        now: exports0['6'],
      },
      'wasi:filesystem/preopens@0.2.0': {
        'get-directories': exports0['23'],
      },
      'wasi:filesystem/types@0.2.0': {
        '[method]descriptor.create-directory-at': exports0['8'],
        '[method]descriptor.link-at': exports0['9'],
        '[method]descriptor.open-at': exports0['10'],
        '[method]descriptor.read': exports0['11'],
        '[method]descriptor.read-directory': exports0['12'],
        '[method]descriptor.readlink-at': exports0['13'],
        '[method]descriptor.remove-directory-at': exports0['14'],
        '[method]descriptor.rename-at': exports0['15'],
        '[method]descriptor.stat': exports0['16'],
        '[method]descriptor.stat-at': exports0['17'],
        '[method]descriptor.symlink-at': exports0['18'],
        '[method]descriptor.sync-data': exports0['19'],
        '[method]descriptor.unlink-file-at': exports0['20'],
        '[method]descriptor.write': exports0['21'],
        '[method]directory-entry-stream.read-directory-entry': exports0['22'],
        '[resource-drop]descriptor': trampoline7,
        '[resource-drop]directory-entry-stream': trampoline8,
      },
      'wasi:io/streams@0.2.0': {
        '[method]input-stream.blocking-read': exports0['3'],
        '[method]output-stream.blocking-flush': exports0['4'],
        '[method]output-stream.blocking-write-and-flush': exports0['5'],
        '[resource-drop]input-stream': trampoline0,
        '[resource-drop]output-stream': trampoline1,
      },
      'wasi:random/random@0.2.0': {
        'get-random-bytes': exports0['7'],
        'get-random-u64': trampoline4,
      },
    }));
    memory0 = exports1.memory;
    realloc0 = exports1.cabi_realloc;
    ({ exports: exports2 } = yield instantiateCore(yield module2, {
      '': {
        $imports: exports0.$imports,
        '0': trampoline9,
        '1': trampoline10,
        '10': trampoline19,
        '11': trampoline20,
        '12': trampoline21,
        '13': trampoline22,
        '14': trampoline23,
        '15': trampoline24,
        '16': trampoline25,
        '17': trampoline26,
        '18': trampoline27,
        '19': trampoline28,
        '2': trampoline11,
        '20': trampoline29,
        '21': trampoline30,
        '22': trampoline31,
        '23': trampoline32,
        '3': trampoline12,
        '4': trampoline13,
        '5': trampoline14,
        '6': trampoline15,
        '7': trampoline16,
        '8': trampoline17,
        '9': trampoline18,
      },
    }));
    ({ exports: exports3 } = yield instantiateCore(yield module3, {
      '': {
        '': exports1._initialize,
      },
    }));
    ({ exports: exports4 } = yield instantiateCore(yield module16));
    ({ exports: exports5 } = yield instantiateCore(yield module4, {
      wasi_snapshot_preview1: {
        adapter_close_badfd: exports4['47'],
        adapter_open_badfd: exports4['48'],
        args_get: exports4['0'],
        args_sizes_get: exports4['1'],
        clock_res_get: exports4['2'],
        clock_time_get: exports4['3'],
        environ_get: exports4['4'],
        environ_sizes_get: exports4['5'],
        fd_advise: exports4['6'],
        fd_allocate: exports4['7'],
        fd_close: exports4['8'],
        fd_datasync: exports4['9'],
        fd_fdstat_get: exports4['10'],
        fd_fdstat_set_flags: exports4['11'],
        fd_fdstat_set_rights: exports4['12'],
        fd_filestat_get: exports4['13'],
        fd_filestat_set_size: exports4['14'],
        fd_filestat_set_times: exports4['15'],
        fd_pread: exports4['16'],
        fd_prestat_dir_name: exports4['17'],
        fd_prestat_get: exports4['18'],
        fd_pwrite: exports4['19'],
        fd_read: exports4['20'],
        fd_readdir: exports4['21'],
        fd_renumber: exports4['22'],
        fd_seek: exports4['23'],
        fd_sync: exports4['24'],
        fd_tell: exports4['25'],
        fd_write: exports4['26'],
        path_create_directory: exports4['27'],
        path_filestat_get: exports4['28'],
        path_filestat_set_times: exports4['29'],
        path_link: exports4['30'],
        path_open: exports4['31'],
        path_readlink: exports4['32'],
        path_remove_directory: exports4['33'],
        path_rename: exports4['34'],
        path_symlink: exports4['35'],
        path_unlink_file: exports4['36'],
        poll_oneoff: exports4['37'],
        proc_exit: exports4['38'],
        proc_raise: exports4['39'],
        random_get: exports4['40'],
        reset_adapter_state: exports4['41'],
        sched_yield: exports4['42'],
        sock_accept: exports4['43'],
        sock_recv: exports4['44'],
        sock_send: exports4['45'],
        sock_shutdown: exports4['46'],
      },
    }));
    ({ exports: exports6 } = yield instantiateCore(yield module5, {
      __main_module__: {
        cabi_realloc: exports5.cabi_realloc,
      },
      env: {
        memory: exports5.memory,
      },
      'wasi:cli/environment@0.2.0': {
        'get-arguments': exports4['89'],
        'get-environment': exports4['88'],
      },
      'wasi:cli/exit@0.2.0': {
        exit: trampoline48,
      },
      'wasi:cli/stderr@0.2.0': {
        'get-stderr': trampoline47,
      },
      'wasi:cli/stdin@0.2.0': {
        'get-stdin': trampoline49,
      },
      'wasi:cli/stdout@0.2.0': {
        'get-stdout': trampoline50,
      },
      'wasi:cli/terminal-input@0.2.0': {
        '[resource-drop]terminal-input': trampoline46,
      },
      'wasi:cli/terminal-output@0.2.0': {
        '[resource-drop]terminal-output': trampoline45,
      },
      'wasi:cli/terminal-stderr@0.2.0': {
        'get-terminal-stderr': exports4['92'],
      },
      'wasi:cli/terminal-stdin@0.2.0': {
        'get-terminal-stdin': exports4['90'],
      },
      'wasi:cli/terminal-stdout@0.2.0': {
        'get-terminal-stdout': exports4['91'],
      },
      'wasi:clocks/monotonic-clock@0.2.0': {
        now: trampoline34,
        resolution: trampoline33,
        'subscribe-duration': trampoline40,
        'subscribe-instant': trampoline41,
      },
      'wasi:clocks/wall-clock@0.2.0': {
        now: exports4['51'],
        resolution: exports4['50'],
      },
      'wasi:filesystem/preopens@0.2.0': {
        'get-directories': exports4['49'],
      },
      'wasi:filesystem/types@0.2.0': {
        '[method]descriptor.advise': exports4['52'],
        '[method]descriptor.append-via-stream': exports4['67'],
        '[method]descriptor.create-directory-at': exports4['60'],
        '[method]descriptor.get-flags': exports4['68'],
        '[method]descriptor.get-type': exports4['54'],
        '[method]descriptor.link-at': exports4['74'],
        '[method]descriptor.metadata-hash': exports4['77'],
        '[method]descriptor.metadata-hash-at': exports4['78'],
        '[method]descriptor.open-at': exports4['75'],
        '[method]descriptor.read': exports4['70'],
        '[method]descriptor.read-directory': exports4['58'],
        '[method]descriptor.read-via-stream': exports4['65'],
        '[method]descriptor.readlink-at': exports4['76'],
        '[method]descriptor.remove-directory-at': exports4['61'],
        '[method]descriptor.rename-at': exports4['62'],
        '[method]descriptor.set-size': exports4['55'],
        '[method]descriptor.set-times': exports4['69'],
        '[method]descriptor.set-times-at': exports4['73'],
        '[method]descriptor.stat': exports4['71'],
        '[method]descriptor.stat-at': exports4['72'],
        '[method]descriptor.symlink-at': exports4['63'],
        '[method]descriptor.sync': exports4['59'],
        '[method]descriptor.sync-data': exports4['53'],
        '[method]descriptor.unlink-file-at': exports4['64'],
        '[method]descriptor.write': exports4['56'],
        '[method]descriptor.write-via-stream': exports4['66'],
        '[method]directory-entry-stream.read-directory-entry': exports4['79'],
        '[resource-drop]descriptor': trampoline39,
        '[resource-drop]directory-entry-stream': trampoline35,
        'filesystem-error-code': exports4['57'],
      },
      'wasi:io/error@0.2.0': {
        '[resource-drop]error': trampoline36,
      },
      'wasi:io/poll@0.2.0': {
        '[resource-drop]pollable': trampoline44,
        poll: exports4['86'],
      },
      'wasi:io/streams@0.2.0': {
        '[method]input-stream.blocking-read': exports4['81'],
        '[method]input-stream.read': exports4['80'],
        '[method]input-stream.subscribe': trampoline43,
        '[method]output-stream.blocking-flush': exports4['85'],
        '[method]output-stream.blocking-write-and-flush': exports4['84'],
        '[method]output-stream.check-write': exports4['82'],
        '[method]output-stream.subscribe': trampoline42,
        '[method]output-stream.write': exports4['83'],
        '[resource-drop]input-stream': trampoline37,
        '[resource-drop]output-stream': trampoline38,
      },
      'wasi:random/random@0.2.0': {
        'get-random-bytes': exports4['87'],
      },
    }));
    ({ exports: exports7 } = yield instantiateCore(yield module6));
    ({ exports: exports8 } = yield instantiateCore(yield module7, {
      'GOT.func': {
        PyInit_componentize_py_runtime: exports5['libcomponentize_py_runtime.so:PyInit_componentize_py_runtime'],
        PyObject_GenericGetDict: exports5['libcomponentize_py_runtime.so:PyObject_GenericGetDict'],
        PyObject_GenericSetDict: exports5['libcomponentize_py_runtime.so:PyObject_GenericSetDict'],
        PyType_GenericAlloc: exports5['libcomponentize_py_runtime.so:PyType_GenericAlloc'],
        '_ZN106_$LT$$LT$std..path..Iter$u20$as$u20$core..fmt..Debug$GT$..fmt..DebugHelper$u20$as$u20$core..fmt..Debug$GT$3fmt17hdcdd660a0dcbc067E': exports5['libcomponentize_py_runtime.so:_ZN106_$LT$$LT$std..path..Iter$u20$as$u20$core..fmt..Debug$GT$..fmt..DebugHelper$u20$as$u20$core..fmt..Debug$GT$3fmt17hdcdd660a0dcbc067E'],
        '_ZN112_$LT$$LT$std..path..Components$u20$as$u20$core..fmt..Debug$GT$..fmt..DebugHelper$u20$as$u20$core..fmt..Debug$GT$3fmt17he5af58d0465550b1E': exports5['libcomponentize_py_runtime.so:_ZN112_$LT$$LT$std..path..Components$u20$as$u20$core..fmt..Debug$GT$..fmt..DebugHelper$u20$as$u20$core..fmt..Debug$GT$3fmt17he5af58d0465550b1E'],
        '_ZN254_$LT$alloc..boxed..convert..$LT$impl$u20$core..convert..From$LT$alloc..string..String$GT$$u20$for$u20$alloc..boxed..Box$LT$dyn$u20$core..error..Error$u2b$core..marker..Sync$u2b$core..marker..Send$GT$$GT$..from..StringError$u20$as$u20$core..fmt..Debug$GT$3fmt17h3a4878bbde23e277E': exports5['libcomponentize_py_runtime.so:_ZN254_$LT$alloc..boxed..convert..$LT$impl$u20$core..convert..From$LT$alloc..string..String$GT$$u20$for$u20$alloc..boxed..Box$LT$dyn$u20$core..error..Error$u2b$core..marker..Sync$u2b$core..marker..Send$GT$$GT$..from..StringError$u20$as$u20$core..fmt..Debug$GT$3fmt17h3a4878bbde23e277E'],
        '_ZN256_$LT$alloc..boxed..convert..$LT$impl$u20$core..convert..From$LT$alloc..string..String$GT$$u20$for$u20$alloc..boxed..Box$LT$dyn$u20$core..error..Error$u2b$core..marker..Sync$u2b$core..marker..Send$GT$$GT$..from..StringError$u20$as$u20$core..fmt..Display$GT$3fmt17h4f43cd4e69575bf2E': exports5['libcomponentize_py_runtime.so:_ZN256_$LT$alloc..boxed..convert..$LT$impl$u20$core..convert..From$LT$alloc..string..String$GT$$u20$for$u20$alloc..boxed..Box$LT$dyn$u20$core..error..Error$u2b$core..marker..Sync$u2b$core..marker..Send$GT$$GT$..from..StringError$u20$as$u20$core..fmt..Display$GT$3fmt17h4f43cd4e69575bf2E'],
        _ZN3std5alloc24default_alloc_error_hook17h3216307ca4cce97cE: exports5['libcomponentize_py_runtime.so:_ZN3std5alloc24default_alloc_error_hook17h3216307ca4cce97cE'],
        '_ZN41_$LT$char$u20$as$u20$core..fmt..Debug$GT$3fmt17h90cd0ef296fab958E': exports5['libcomponentize_py_runtime.so:_ZN41_$LT$char$u20$as$u20$core..fmt..Debug$GT$3fmt17h90cd0ef296fab958E'],
        '_ZN43_$LT$char$u20$as$u20$core..fmt..Display$GT$3fmt17h989f15e63f93bb2fE': exports5['libcomponentize_py_runtime.so:_ZN43_$LT$char$u20$as$u20$core..fmt..Display$GT$3fmt17h989f15e63f93bb2fE'],
        '_ZN4core3fmt3num3imp51_$LT$impl$u20$core..fmt..Display$u20$for$u20$u8$GT$3fmt17h136e0f9a094e2e15E': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num3imp51_$LT$impl$u20$core..fmt..Display$u20$for$u20$u8$GT$3fmt17h136e0f9a094e2e15E'],
        '_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$i32$GT$3fmt17h8c24a65babf8ec37E': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$i32$GT$3fmt17h8c24a65babf8ec37E'],
        '_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$u16$GT$3fmt17h8942d36f21f5185aE': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$u16$GT$3fmt17h8942d36f21f5185aE'],
        '_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$u32$GT$3fmt17h56ed463b63659d02E': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$u32$GT$3fmt17h56ed463b63659d02E'],
        '_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$u64$GT$3fmt17h55e6591dee6b4c17E': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$u64$GT$3fmt17h55e6591dee6b4c17E'],
        '_ZN4core3fmt3num3imp54_$LT$impl$u20$core..fmt..Display$u20$for$u20$isize$GT$3fmt17h7fe33f5715fa01e7E': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num3imp54_$LT$impl$u20$core..fmt..Display$u20$for$u20$isize$GT$3fmt17h7fe33f5715fa01e7E'],
        '_ZN4core3fmt3num3imp54_$LT$impl$u20$core..fmt..Display$u20$for$u20$usize$GT$3fmt17hc5537ffb0eb93b52E': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num3imp54_$LT$impl$u20$core..fmt..Display$u20$for$u20$usize$GT$3fmt17hc5537ffb0eb93b52E'],
        '_ZN4core3fmt3num52_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u8$GT$3fmt17hd4cf5a9874b94f15E': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num52_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u8$GT$3fmt17hd4cf5a9874b94f15E'],
        '_ZN4core3fmt3num52_$LT$impl$u20$core..fmt..UpperHex$u20$for$u20$u8$GT$3fmt17h5ac90fabcb1f9818E': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num52_$LT$impl$u20$core..fmt..UpperHex$u20$for$u20$u8$GT$3fmt17h5ac90fabcb1f9818E'],
        '_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u16$GT$3fmt17h9e47e7df57729d28E': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u16$GT$3fmt17h9e47e7df57729d28E'],
        '_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u32$GT$3fmt17hb8cbf9f24d2b5cdeE': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u32$GT$3fmt17hb8cbf9f24d2b5cdeE'],
        '_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..UpperHex$u20$for$u20$u16$GT$3fmt17h189609f59218c372E': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..UpperHex$u20$for$u20$u16$GT$3fmt17h189609f59218c372E'],
        '_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..UpperHex$u20$for$u20$u32$GT$3fmt17h37d40201ca36bec3E': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..UpperHex$u20$for$u20$u32$GT$3fmt17h37d40201ca36bec3E'],
        '_ZN4core3fmt3num54_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u128$GT$3fmt17h99db017386d32ad7E': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num54_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u128$GT$3fmt17h99db017386d32ad7E'],
        '_ZN4core3fmt3num55_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$usize$GT$3fmt17h1cc9c3c35dba6e6cE': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt3num55_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$usize$GT$3fmt17h1cc9c3c35dba6e6cE'],
        '_ZN4core3fmt5float50_$LT$impl$u20$core..fmt..Debug$u20$for$u20$f32$GT$3fmt17h2c9ddb84ca382b3aE': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt5float50_$LT$impl$u20$core..fmt..Debug$u20$for$u20$f32$GT$3fmt17h2c9ddb84ca382b3aE'],
        '_ZN4core3fmt5float50_$LT$impl$u20$core..fmt..Debug$u20$for$u20$f64$GT$3fmt17hed9dd6c175d7379cE': exports5['libcomponentize_py_runtime.so:_ZN4core3fmt5float50_$LT$impl$u20$core..fmt..Debug$u20$for$u20$f64$GT$3fmt17hed9dd6c175d7379cE'],
        '_ZN53_$LT$pyo3..err..PyErr$u20$as$u20$core..fmt..Debug$GT$3fmt17h64fedec6dc930c40E': exports5['libcomponentize_py_runtime.so:_ZN53_$LT$pyo3..err..PyErr$u20$as$u20$core..fmt..Debug$GT$3fmt17h64fedec6dc930c40E'],
        '_ZN54_$LT$std..fs..FileType$u20$as$u20$core..fmt..Debug$GT$3fmt17h0b71358c6ea0a427E': exports5['libcomponentize_py_runtime.so:_ZN54_$LT$std..fs..FileType$u20$as$u20$core..fmt..Debug$GT$3fmt17h0b71358c6ea0a427E'],
        '_ZN55_$LT$pyo3..err..PyErr$u20$as$u20$core..fmt..Display$GT$3fmt17h39de8fc040b1bfb6E': exports5['libcomponentize_py_runtime.so:_ZN55_$LT$pyo3..err..PyErr$u20$as$u20$core..fmt..Display$GT$3fmt17h39de8fc040b1bfb6E'],
        '_ZN55_$LT$std..path..PathBuf$u20$as$u20$core..fmt..Debug$GT$3fmt17hd1632f9d39d1d0b7E': exports5['libcomponentize_py_runtime.so:_ZN55_$LT$std..path..PathBuf$u20$as$u20$core..fmt..Debug$GT$3fmt17hd1632f9d39d1d0b7E'],
        '_ZN56_$LT$anyhow..ensure..Buf$u20$as$u20$core..fmt..Write$GT$9write_str17hbfb639c161300f9fE': exports5['libcomponentize_py_runtime.so:_ZN56_$LT$anyhow..ensure..Buf$u20$as$u20$core..fmt..Write$GT$9write_str17hbfb639c161300f9fE'],
        '_ZN56_$LT$std..thread..Thread$u20$as$u20$core..fmt..Debug$GT$3fmt17h12af5fb05fd2f592E': exports5['libcomponentize_py_runtime.so:_ZN56_$LT$std..thread..Thread$u20$as$u20$core..fmt..Debug$GT$3fmt17h12af5fb05fd2f592E'],
        '_ZN57_$LT$core..fmt..Arguments$u20$as$u20$core..fmt..Debug$GT$3fmt17hfa7359c813b232f0E': exports5['libcomponentize_py_runtime.so:_ZN57_$LT$core..fmt..Arguments$u20$as$u20$core..fmt..Debug$GT$3fmt17hfa7359c813b232f0E'],
        '_ZN58_$LT$std..time..SystemTime$u20$as$u20$core..fmt..Debug$GT$3fmt17he6aaf759a4c2bb57E': exports5['libcomponentize_py_runtime.so:_ZN58_$LT$std..time..SystemTime$u20$as$u20$core..fmt..Debug$GT$3fmt17he6aaf759a4c2bb57E'],
        '_ZN59_$LT$core..fmt..Arguments$u20$as$u20$core..fmt..Display$GT$3fmt17hcd9d65354d409438E': exports5['libcomponentize_py_runtime.so:_ZN59_$LT$core..fmt..Arguments$u20$as$u20$core..fmt..Display$GT$3fmt17hcd9d65354d409438E'],
        '_ZN60_$LT$core..str..lossy..Debug$u20$as$u20$core..fmt..Debug$GT$3fmt17h457f0a13df6fe1e4E': exports5['libcomponentize_py_runtime.so:_ZN60_$LT$core..str..lossy..Debug$u20$as$u20$core..fmt..Debug$GT$3fmt17h457f0a13df6fe1e4E'],
        '_ZN60_$LT$std..io..error..Error$u20$as$u20$core..fmt..Display$GT$3fmt17ha0b3dbf84ae8b585E': exports5['libcomponentize_py_runtime.so:_ZN60_$LT$std..io..error..Error$u20$as$u20$core..fmt..Display$GT$3fmt17ha0b3dbf84ae8b585E'],
        '_ZN62_$LT$core..cell..BorrowError$u20$as$u20$core..fmt..Display$GT$3fmt17hea55305ea50d64aeE': exports5['libcomponentize_py_runtime.so:_ZN62_$LT$core..cell..BorrowError$u20$as$u20$core..fmt..Display$GT$3fmt17hea55305ea50d64aeE'],
        '_ZN63_$LT$std..ffi..os_str..OsString$u20$as$u20$core..fmt..Debug$GT$3fmt17h349bdb00fa90c00bE': exports5['libcomponentize_py_runtime.so:_ZN63_$LT$std..ffi..os_str..OsString$u20$as$u20$core..fmt..Debug$GT$3fmt17h349bdb00fa90c00bE'],
        '_ZN63_$LT$std..sys..env..common..Env$u20$as$u20$core..fmt..Debug$GT$3fmt17h04c11edbc0d5abfcE': exports5['libcomponentize_py_runtime.so:_ZN63_$LT$std..sys..env..common..Env$u20$as$u20$core..fmt..Debug$GT$3fmt17h04c11edbc0d5abfcE'],
        '_ZN63_$LT$wasi..lib_generated..Errno$u20$as$u20$core..fmt..Debug$GT$3fmt17hca6bc30c5a796c08E': exports5['libcomponentize_py_runtime.so:_ZN63_$LT$wasi..lib_generated..Errno$u20$as$u20$core..fmt..Debug$GT$3fmt17hca6bc30c5a796c08E'],
        '_ZN64_$LT$anyhow..wrapper..BoxedError$u20$as$u20$core..fmt..Debug$GT$3fmt17hd10ff17c329b6768E': exports5['libcomponentize_py_runtime.so:_ZN64_$LT$anyhow..wrapper..BoxedError$u20$as$u20$core..fmt..Debug$GT$3fmt17hd10ff17c329b6768E'],
        '_ZN65_$LT$core..ascii..EscapeDefault$u20$as$u20$core..fmt..Display$GT$3fmt17h55d5f08e4c539a87E': exports5['libcomponentize_py_runtime.so:_ZN65_$LT$core..ascii..EscapeDefault$u20$as$u20$core..fmt..Display$GT$3fmt17h55d5f08e4c539a87E'],
        '_ZN65_$LT$core..cell..BorrowMutError$u20$as$u20$core..fmt..Display$GT$3fmt17h5a09dddf1eff90b9E': exports5['libcomponentize_py_runtime.so:_ZN65_$LT$core..cell..BorrowMutError$u20$as$u20$core..fmt..Display$GT$3fmt17h5a09dddf1eff90b9E'],
        '_ZN65_$LT$std..sys..args..common..Args$u20$as$u20$core..fmt..Debug$GT$3fmt17h438b2b6ab0f3bd65E': exports5['libcomponentize_py_runtime.so:_ZN65_$LT$std..sys..args..common..Args$u20$as$u20$core..fmt..Debug$GT$3fmt17h438b2b6ab0f3bd65E'],
        '_ZN66_$LT$anyhow..wrapper..BoxedError$u20$as$u20$core..error..Error$GT$6source17h8d75067b1fcf1ec0E': exports5['libcomponentize_py_runtime.so:_ZN66_$LT$anyhow..wrapper..BoxedError$u20$as$u20$core..error..Error$GT$6source17h8d75067b1fcf1ec0E'],
        '_ZN66_$LT$anyhow..wrapper..BoxedError$u20$as$u20$core..fmt..Display$GT$3fmt17h73d85f8383aa3946E': exports5['libcomponentize_py_runtime.so:_ZN66_$LT$anyhow..wrapper..BoxedError$u20$as$u20$core..fmt..Display$GT$3fmt17h73d85f8383aa3946E'],
        '_ZN66_$LT$std..sys..stdio..wasip1..Stderr$u20$as$u20$std..io..Write$GT$14write_vectored17he4b60357cc01ca13E': exports5['libcomponentize_py_runtime.so:_ZN66_$LT$std..sys..stdio..wasip1..Stderr$u20$as$u20$std..io..Write$GT$14write_vectored17he4b60357cc01ca13E'],
        '_ZN66_$LT$std..sys..stdio..wasip1..Stderr$u20$as$u20$std..io..Write$GT$5write17h23747af9172e696bE': exports5['libcomponentize_py_runtime.so:_ZN66_$LT$std..sys..stdio..wasip1..Stderr$u20$as$u20$std..io..Write$GT$5write17h23747af9172e696bE'],
        '_ZN67_$LT$core..net..ip_addr..Ipv4Addr$u20$as$u20$core..fmt..Display$GT$3fmt17hda761ebf91591477E': exports5['libcomponentize_py_runtime.so:_ZN67_$LT$core..net..ip_addr..Ipv4Addr$u20$as$u20$core..fmt..Display$GT$3fmt17hda761ebf91591477E'],
        '_ZN68_$LT$core..fmt..builders..PadAdapter$u20$as$u20$core..fmt..Write$GT$10write_char17h04e391e537672539E': exports5['libcomponentize_py_runtime.so:_ZN68_$LT$core..fmt..builders..PadAdapter$u20$as$u20$core..fmt..Write$GT$10write_char17h04e391e537672539E'],
        '_ZN68_$LT$core..fmt..builders..PadAdapter$u20$as$u20$core..fmt..Write$GT$9write_str17h82c8961efb9880d9E': exports5['libcomponentize_py_runtime.so:_ZN68_$LT$core..fmt..builders..PadAdapter$u20$as$u20$core..fmt..Write$GT$9write_str17h82c8961efb9880d9E'],
        '_ZN68_$LT$std..thread..local..AccessError$u20$as$u20$core..fmt..Debug$GT$3fmt17ha64982c736394091E': exports5['libcomponentize_py_runtime.so:_ZN68_$LT$std..thread..local..AccessError$u20$as$u20$core..fmt..Debug$GT$3fmt17ha64982c736394091E'],
        '_ZN6anyhow5error60_$LT$impl$u20$core..fmt..Debug$u20$for$u20$anyhow..Error$GT$3fmt17h2440aed05d75103dE': exports5['libcomponentize_py_runtime.so:_ZN6anyhow5error60_$LT$impl$u20$core..fmt..Debug$u20$for$u20$anyhow..Error$GT$3fmt17h2440aed05d75103dE'],
        '_ZN70_$LT$core..slice..ascii..EscapeAscii$u20$as$u20$core..fmt..Display$GT$3fmt17ha8bf817867d8d134E': exports5['libcomponentize_py_runtime.so:_ZN70_$LT$core..slice..ascii..EscapeAscii$u20$as$u20$core..fmt..Display$GT$3fmt17ha8bf817867d8d134E'],
        '_ZN71_$LT$std..sys..env..common..EnvStrDebug$u20$as$u20$core..fmt..Debug$GT$3fmt17hfb687a88b15c608fE': exports5['libcomponentize_py_runtime.so:_ZN71_$LT$std..sys..env..common..EnvStrDebug$u20$as$u20$core..fmt..Debug$GT$3fmt17hfb687a88b15c608fE'],
        '_ZN71_$LT$std..sys..process..env..CommandEnv$u20$as$u20$core..fmt..Debug$GT$3fmt17h56f8aca3164211d4E': exports5['libcomponentize_py_runtime.so:_ZN71_$LT$std..sys..process..env..CommandEnv$u20$as$u20$core..fmt..Debug$GT$3fmt17h56f8aca3164211d4E'],
        '_ZN74_$LT$core..num..niche_types..I32NotAllOnes$u20$as$u20$core..fmt..Debug$GT$3fmt17hd09cfd369d1a644dE': exports5['libcomponentize_py_runtime.so:_ZN74_$LT$core..num..niche_types..I32NotAllOnes$u20$as$u20$core..fmt..Debug$GT$3fmt17hd09cfd369d1a644dE'],
        '_ZN79_$LT$std..backtrace_rs..symbolize..SymbolName$u20$as$u20$core..fmt..Display$GT$3fmt17h32f95b95f6790ecbE': exports5['libcomponentize_py_runtime.so:_ZN79_$LT$std..backtrace_rs..symbolize..SymbolName$u20$as$u20$core..fmt..Display$GT$3fmt17h32f95b95f6790ecbE'],
        '_ZN79_$LT$std..panicking..resume_unwind..RewrapBox$u20$as$u20$core..fmt..Display$GT$3fmt17h3710458dd95fff58E': exports5['libcomponentize_py_runtime.so:_ZN79_$LT$std..panicking..resume_unwind..RewrapBox$u20$as$u20$core..fmt..Display$GT$3fmt17h3710458dd95fff58E'],
        '_ZN86_$LT$std..panicking..panic_handler..StaticStrPayload$u20$as$u20$core..fmt..Display$GT$3fmt17h314e5f0c96f156e3E': exports5['libcomponentize_py_runtime.so:_ZN86_$LT$std..panicking..panic_handler..StaticStrPayload$u20$as$u20$core..fmt..Display$GT$3fmt17h314e5f0c96f156e3E'],
        '_ZN86_$LT$std..panicking..resume_unwind..RewrapBox$u20$as$u20$core..panic..PanicPayload$GT$8take_box17h2a26318c64b8bc8dE': exports5['libcomponentize_py_runtime.so:_ZN86_$LT$std..panicking..resume_unwind..RewrapBox$u20$as$u20$core..panic..PanicPayload$GT$8take_box17h2a26318c64b8bc8dE'],
        '_ZN89_$LT$std..panicking..panic_handler..FormatStringPayload$u20$as$u20$core..fmt..Display$GT$3fmt17h378dc741c1728fb4E': exports5['libcomponentize_py_runtime.so:_ZN89_$LT$std..panicking..panic_handler..FormatStringPayload$u20$as$u20$core..fmt..Display$GT$3fmt17h378dc741c1728fb4E'],
        '_ZN93_$LT$std..panicking..panic_handler..StaticStrPayload$u20$as$u20$core..panic..PanicPayload$GT$8take_box17hf6db74db4016422eE': exports5['libcomponentize_py_runtime.so:_ZN93_$LT$std..panicking..panic_handler..StaticStrPayload$u20$as$u20$core..panic..PanicPayload$GT$8take_box17hf6db74db4016422eE'],
        '_ZN96_$LT$std..panicking..panic_handler..FormatStringPayload$u20$as$u20$core..panic..PanicPayload$GT$3get17h58c1501ce8c6278dE': exports5['libcomponentize_py_runtime.so:_ZN96_$LT$std..panicking..panic_handler..FormatStringPayload$u20$as$u20$core..panic..PanicPayload$GT$3get17h58c1501ce8c6278dE'],
        '_ZN96_$LT$std..panicking..panic_handler..FormatStringPayload$u20$as$u20$core..panic..PanicPayload$GT$8take_box17h523b78cd8cc1228eE': exports5['libcomponentize_py_runtime.so:_ZN96_$LT$std..panicking..panic_handler..FormatStringPayload$u20$as$u20$core..panic..PanicPayload$GT$8take_box17h523b78cd8cc1228eE'],
        '_ZN98_$LT$std..sys..backtrace..BacktraceLock..print..DisplayBacktrace$u20$as$u20$core..fmt..Display$GT$3fmt17h13ad9e9b3e2437e0E': exports5['libcomponentize_py_runtime.so:_ZN98_$LT$std..sys..backtrace..BacktraceLock..print..DisplayBacktrace$u20$as$u20$core..fmt..Display$GT$3fmt17h13ad9e9b3e2437e0E'],
        cabi_realloc: exports5['libcomponentize_py_runtime.so:cabi_realloc'],
      },
      'GOT.mem': {
        PyBaseObject_Type: exports5['libcomponentize_py_runtime.so:PyBaseObject_Type'],
        PyBool_Type: exports5['libcomponentize_py_runtime.so:PyBool_Type'],
        PyByteArray_Type: exports5['libcomponentize_py_runtime.so:PyByteArray_Type'],
        PyExc_AttributeError: exports5['libcomponentize_py_runtime.so:PyExc_AttributeError'],
        PyExc_BaseException: exports5['libcomponentize_py_runtime.so:PyExc_BaseException'],
        PyExc_BlockingIOError: exports5['libcomponentize_py_runtime.so:PyExc_BlockingIOError'],
        PyExc_BrokenPipeError: exports5['libcomponentize_py_runtime.so:PyExc_BrokenPipeError'],
        PyExc_ConnectionAbortedError: exports5['libcomponentize_py_runtime.so:PyExc_ConnectionAbortedError'],
        PyExc_ConnectionRefusedError: exports5['libcomponentize_py_runtime.so:PyExc_ConnectionRefusedError'],
        PyExc_ConnectionResetError: exports5['libcomponentize_py_runtime.so:PyExc_ConnectionResetError'],
        PyExc_FileExistsError: exports5['libcomponentize_py_runtime.so:PyExc_FileExistsError'],
        PyExc_FileNotFoundError: exports5['libcomponentize_py_runtime.so:PyExc_FileNotFoundError'],
        PyExc_ImportError: exports5['libcomponentize_py_runtime.so:PyExc_ImportError'],
        PyExc_InterruptedError: exports5['libcomponentize_py_runtime.so:PyExc_InterruptedError'],
        PyExc_IsADirectoryError: exports5['libcomponentize_py_runtime.so:PyExc_IsADirectoryError'],
        PyExc_MemoryError: exports5['libcomponentize_py_runtime.so:PyExc_MemoryError'],
        PyExc_NotADirectoryError: exports5['libcomponentize_py_runtime.so:PyExc_NotADirectoryError'],
        PyExc_OSError: exports5['libcomponentize_py_runtime.so:PyExc_OSError'],
        PyExc_OverflowError: exports5['libcomponentize_py_runtime.so:PyExc_OverflowError'],
        PyExc_PermissionError: exports5['libcomponentize_py_runtime.so:PyExc_PermissionError'],
        PyExc_RuntimeError: exports5['libcomponentize_py_runtime.so:PyExc_RuntimeError'],
        PyExc_SystemError: exports5['libcomponentize_py_runtime.so:PyExc_SystemError'],
        PyExc_TimeoutError: exports5['libcomponentize_py_runtime.so:PyExc_TimeoutError'],
        PyExc_TypeError: exports5['libcomponentize_py_runtime.so:PyExc_TypeError'],
        PyExc_UnicodeDecodeError: exports5['libcomponentize_py_runtime.so:PyExc_UnicodeDecodeError'],
        PyExc_ValueError: exports5['libcomponentize_py_runtime.so:PyExc_ValueError'],
        PyLong_Type: exports5['libcomponentize_py_runtime.so:PyLong_Type'],
        PyModule_Type: exports5['libcomponentize_py_runtime.so:PyModule_Type'],
        PyRange_Type: exports5['libcomponentize_py_runtime.so:PyRange_Type'],
        PySuper_Type: exports5['libcomponentize_py_runtime.so:PySuper_Type'],
        _CLOCK_MONOTONIC: exports5['libcomponentize_py_runtime.so:_CLOCK_MONOTONIC'],
        _CLOCK_PROCESS_CPUTIME_ID: exports5['libcomponentize_py_runtime.so:_CLOCK_PROCESS_CPUTIME_ID'],
        _CLOCK_REALTIME: exports5['libcomponentize_py_runtime.so:_CLOCK_REALTIME'],
        _CLOCK_THREAD_CPUTIME_ID: exports5['libcomponentize_py_runtime.so:_CLOCK_THREAD_CPUTIME_ID'],
        _PyWeakref_CallableProxyType: exports5['libcomponentize_py_runtime.so:_PyWeakref_CallableProxyType'],
        _PyWeakref_ProxyType: exports5['libcomponentize_py_runtime.so:_PyWeakref_ProxyType'],
        _PyWeakref_RefType: exports5['libcomponentize_py_runtime.so:_PyWeakref_RefType'],
        _Py_FalseStruct: exports5['libcomponentize_py_runtime.so:_Py_FalseStruct'],
        _Py_NoneStruct: exports5['libcomponentize_py_runtime.so:_Py_NoneStruct'],
        _Py_TrueStruct: exports5['libcomponentize_py_runtime.so:_Py_TrueStruct'],
        _ZN3std2io5stdio6stderr8INSTANCE17h8ff5d5e318e80a25E: exports5['libcomponentize_py_runtime.so:_ZN3std2io5stdio6stderr8INSTANCE17h8ff5d5e318e80a25E'],
        _ZN3std4hash6random11RandomState3new4KEYS28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17h746d1020d9bcb391E: exports5['libcomponentize_py_runtime.so:_ZN3std4hash6random11RandomState3new4KEYS28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17h746d1020d9bcb391E'],
        _ZN3std4sync4mpmc5waker17current_thread_id5DUMMY28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17hc9a0250b98262fd5E: exports5['libcomponentize_py_runtime.so:_ZN3std4sync4mpmc5waker17current_thread_id5DUMMY28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17hc9a0250b98262fd5E'],
        _ZN3std5alloc4HOOK17h20769bdf4aef60c1E: exports5['libcomponentize_py_runtime.so:_ZN3std5alloc4HOOK17h20769bdf4aef60c1E'],
        _ZN3std6thread7current2id2ID17hf767b40513ccbad0E: exports5['libcomponentize_py_runtime.so:_ZN3std6thread7current2id2ID17hf767b40513ccbad0E'],
        _ZN3std6thread7current7CURRENT17h5d5fadd57b31de29E: exports5['libcomponentize_py_runtime.so:_ZN3std6thread7current7CURRENT17h5d5fadd57b31de29E'],
        _ZN3std6thread9spawnhook11SPAWN_HOOKS28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17ha8c951123c883964E: exports5['libcomponentize_py_runtime.so:_ZN3std6thread9spawnhook11SPAWN_HOOKS28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17ha8c951123c883964E'],
        _ZN3std9panicking11panic_count18GLOBAL_PANIC_COUNT17h0e9afc33c554212dE: exports5['libcomponentize_py_runtime.so:_ZN3std9panicking11panic_count18GLOBAL_PANIC_COUNT17h0e9afc33c554212dE'],
        _ZN3std9panicking4HOOK17he27851ff2a95e3bcE: exports5['libcomponentize_py_runtime.so:_ZN3std9panicking4HOOK17he27851ff2a95e3bcE'],
        _ZN4core3num7flt2dec8strategy5grisu12CACHED_POW1017h245f4845a56781b7E: exports5['libcomponentize_py_runtime.so:_ZN4core3num7flt2dec8strategy5grisu12CACHED_POW1017h245f4845a56781b7E'],
        _ZN4core7unicode12unicode_data11white_space14WHITESPACE_MAP17hdb30b7a7fa132b9eE: exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data11white_space14WHITESPACE_MAP17hdb30b7a7fa132b9eE'],
        _ZN4core7unicode12unicode_data9lowercase14BITSET_MAPPING17h7b5959b5b3a91b3cE: exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9lowercase14BITSET_MAPPING17h7b5959b5b3a91b3cE'],
        _ZN4core7unicode12unicode_data9lowercase16BITSET_CANONICAL17hf093b885c4cc2c6cE: exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9lowercase16BITSET_CANONICAL17hf093b885c4cc2c6cE'],
        _ZN4core7unicode12unicode_data9lowercase17BITSET_CHUNKS_MAP17hc4a0f1107853b0bbE: exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9lowercase17BITSET_CHUNKS_MAP17hc4a0f1107853b0bbE'],
        _ZN4core7unicode12unicode_data9lowercase19BITSET_INDEX_CHUNKS17ha2af8d4cb9f50aa2E: exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9lowercase19BITSET_INDEX_CHUNKS17ha2af8d4cb9f50aa2E'],
        _ZN4core7unicode12unicode_data9uppercase14BITSET_MAPPING17h7b240eae70249a98E: exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9uppercase14BITSET_MAPPING17h7b240eae70249a98E'],
        _ZN4core7unicode12unicode_data9uppercase16BITSET_CANONICAL17hb64b329ca8154c50E: exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9uppercase16BITSET_CANONICAL17hb64b329ca8154c50E'],
        _ZN4core7unicode12unicode_data9uppercase17BITSET_CHUNKS_MAP17hb72af7ce6470de5cE: exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9uppercase17BITSET_CHUNKS_MAP17hb72af7ce6470de5cE'],
        _ZN4core7unicode12unicode_data9uppercase19BITSET_INDEX_CHUNKS17h3f86610b88827841E: exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9uppercase19BITSET_INDEX_CHUNKS17h3f86610b88827841E'],
        errno: exports5['libcomponentize_py_runtime.so:errno'],
      },
      env: {
        PyBuffer_Release: exports5.PyBuffer_Release,
        PyByteArray_AsString: exports5.PyByteArray_AsString,
        PyByteArray_FromObject: exports5.PyByteArray_FromObject,
        PyByteArray_FromStringAndSize: exports5.PyByteArray_FromStringAndSize,
        PyByteArray_Resize: exports5.PyByteArray_Resize,
        PyByteArray_Size: exports5.PyByteArray_Size,
        PyBytes_AsString: exports5.PyBytes_AsString,
        PyBytes_FromStringAndSize: exports5.PyBytes_FromStringAndSize,
        PyBytes_Size: exports5.PyBytes_Size,
        PyCMethod_New: exports5.PyCMethod_New,
        PyCallable_Check: exports5.PyCallable_Check,
        PyCapsule_GetContext: exports5.PyCapsule_GetContext,
        PyCapsule_GetName: exports5.PyCapsule_GetName,
        PyCapsule_GetPointer: exports5.PyCapsule_GetPointer,
        PyCapsule_IsValid: exports5.PyCapsule_IsValid,
        PyCapsule_SetContext: exports5.PyCapsule_SetContext,
        PyComplex_FromDoubles: exports5.PyComplex_FromDoubles,
        PyComplex_ImagAsDouble: exports5.PyComplex_ImagAsDouble,
        PyComplex_RealAsDouble: exports5.PyComplex_RealAsDouble,
        PyDictProxy_New: exports5.PyDictProxy_New,
        PyDict_Clear: exports5.PyDict_Clear,
        PyDict_Contains: exports5.PyDict_Contains,
        PyDict_Copy: exports5.PyDict_Copy,
        PyDict_DelItem: exports5.PyDict_DelItem,
        PyDict_GetItemWithError: exports5.PyDict_GetItemWithError,
        PyDict_Items: exports5.PyDict_Items,
        PyDict_Keys: exports5.PyDict_Keys,
        PyDict_Merge: exports5.PyDict_Merge,
        PyDict_MergeFromSeq2: exports5.PyDict_MergeFromSeq2,
        PyDict_New: exports5.PyDict_New,
        PyDict_SetItem: exports5.PyDict_SetItem,
        PyDict_Size: exports5.PyDict_Size,
        PyDict_Update: exports5.PyDict_Update,
        PyDict_Values: exports5.PyDict_Values,
        PyErr_CheckSignals: exports5.PyErr_CheckSignals,
        PyErr_Clear: exports5.PyErr_Clear,
        PyErr_DisplayException: exports5.PyErr_DisplayException,
        PyErr_GetRaisedException: exports5.PyErr_GetRaisedException,
        PyErr_GivenExceptionMatches: exports5.PyErr_GivenExceptionMatches,
        PyErr_NewExceptionWithDoc: exports5.PyErr_NewExceptionWithDoc,
        PyErr_Occurred: exports5.PyErr_Occurred,
        PyErr_Print: exports5.PyErr_Print,
        PyErr_PrintEx: exports5.PyErr_PrintEx,
        PyErr_SetObject: exports5.PyErr_SetObject,
        PyErr_SetRaisedException: exports5.PyErr_SetRaisedException,
        PyErr_SetString: exports5.PyErr_SetString,
        PyErr_WarnEx: exports5.PyErr_WarnEx,
        PyErr_WarnExplicit: exports5.PyErr_WarnExplicit,
        PyErr_WriteUnraisable: exports5.PyErr_WriteUnraisable,
        PyEval_EvalCode: exports5.PyEval_EvalCode,
        PyEval_GetBuiltins: exports5.PyEval_GetBuiltins,
        PyEval_RestoreThread: exports5.PyEval_RestoreThread,
        PyEval_SaveThread: exports5.PyEval_SaveThread,
        PyException_GetCause: exports5.PyException_GetCause,
        PyException_GetTraceback: exports5.PyException_GetTraceback,
        PyException_SetCause: exports5.PyException_SetCause,
        PyException_SetTraceback: exports5.PyException_SetTraceback,
        PyFloat_AsDouble: exports5.PyFloat_AsDouble,
        PyFloat_FromDouble: exports5.PyFloat_FromDouble,
        PyFrozenSet_New: exports5.PyFrozenSet_New,
        PyGILState_Ensure: exports5.PyGILState_Ensure,
        PyGILState_Release: exports5.PyGILState_Release,
        PyImport_AddModule: exports5.PyImport_AddModule,
        PyImport_AppendInittab: exports5.PyImport_AppendInittab,
        PyImport_ExecCodeModuleEx: exports5.PyImport_ExecCodeModuleEx,
        PyImport_Import: exports5.PyImport_Import,
        PyInterpreterState_Get: exports5.PyInterpreterState_Get,
        PyInterpreterState_GetID: exports5.PyInterpreterState_GetID,
        PyIter_Check: exports5.PyIter_Check,
        PyIter_Next: exports5.PyIter_Next,
        PyList_Append: exports5.PyList_Append,
        PyList_AsTuple: exports5.PyList_AsTuple,
        PyList_GetItem: exports5.PyList_GetItem,
        PyList_GetSlice: exports5.PyList_GetSlice,
        PyList_Insert: exports5.PyList_Insert,
        PyList_New: exports5.PyList_New,
        PyList_Reverse: exports5.PyList_Reverse,
        PyList_SetItem: exports5.PyList_SetItem,
        PyList_Size: exports5.PyList_Size,
        PyList_Sort: exports5.PyList_Sort,
        PyLong_AsLong: exports5.PyLong_AsLong,
        PyLong_AsLongLong: exports5.PyLong_AsLongLong,
        PyLong_AsUnsignedLongLong: exports5.PyLong_AsUnsignedLongLong,
        PyLong_AsUnsignedLongLongMask: exports5.PyLong_AsUnsignedLongLongMask,
        PyLong_FromLong: exports5.PyLong_FromLong,
        PyLong_FromLongLong: exports5.PyLong_FromLongLong,
        PyLong_FromSsize_t: exports5.PyLong_FromSsize_t,
        PyLong_FromUnsignedLongLong: exports5.PyLong_FromUnsignedLongLong,
        PyMapping_Keys: exports5.PyMapping_Keys,
        PyMemoryView_FromObject: exports5.PyMemoryView_FromObject,
        PyModule_Create2: exports5.PyModule_Create2,
        PyModule_GetDict: exports5.PyModule_GetDict,
        PyModule_GetFilenameObject: exports5.PyModule_GetFilenameObject,
        PyModule_GetNameObject: exports5.PyModule_GetNameObject,
        PyModule_NewObject: exports5.PyModule_NewObject,
        PyNumber_Absolute: exports5.PyNumber_Absolute,
        PyNumber_Add: exports5.PyNumber_Add,
        PyNumber_And: exports5.PyNumber_And,
        PyNumber_Divmod: exports5.PyNumber_Divmod,
        PyNumber_FloorDivide: exports5.PyNumber_FloorDivide,
        PyNumber_Index: exports5.PyNumber_Index,
        PyNumber_Invert: exports5.PyNumber_Invert,
        PyNumber_Lshift: exports5.PyNumber_Lshift,
        PyNumber_MatrixMultiply: exports5.PyNumber_MatrixMultiply,
        PyNumber_Multiply: exports5.PyNumber_Multiply,
        PyNumber_Negative: exports5.PyNumber_Negative,
        PyNumber_Or: exports5.PyNumber_Or,
        PyNumber_Positive: exports5.PyNumber_Positive,
        PyNumber_Power: exports5.PyNumber_Power,
        PyNumber_Remainder: exports5.PyNumber_Remainder,
        PyNumber_Rshift: exports5.PyNumber_Rshift,
        PyNumber_Subtract: exports5.PyNumber_Subtract,
        PyNumber_TrueDivide: exports5.PyNumber_TrueDivide,
        PyNumber_Xor: exports5.PyNumber_Xor,
        PyOS_FSPath: exports5.PyOS_FSPath,
        PyObject_Call: exports5.PyObject_Call,
        PyObject_CallMethodObjArgs: exports5.PyObject_CallMethodObjArgs,
        PyObject_CallNoArgs: exports5.PyObject_CallNoArgs,
        PyObject_DelItem: exports5.PyObject_DelItem,
        PyObject_Dir: exports5.PyObject_Dir,
        PyObject_GenericGetDict: exports5.PyObject_GenericGetDict,
        PyObject_GenericSetDict: exports5.PyObject_GenericSetDict,
        PyObject_GetAttr: exports5.PyObject_GetAttr,
        PyObject_GetItem: exports5.PyObject_GetItem,
        PyObject_GetIter: exports5.PyObject_GetIter,
        PyObject_Hash: exports5.PyObject_Hash,
        PyObject_IsInstance: exports5.PyObject_IsInstance,
        PyObject_IsSubclass: exports5.PyObject_IsSubclass,
        PyObject_IsTrue: exports5.PyObject_IsTrue,
        PyObject_Repr: exports5.PyObject_Repr,
        PyObject_RichCompare: exports5.PyObject_RichCompare,
        PyObject_SetAttr: exports5.PyObject_SetAttr,
        PyObject_SetAttrString: exports5.PyObject_SetAttrString,
        PyObject_SetItem: exports5.PyObject_SetItem,
        PyObject_Size: exports5.PyObject_Size,
        PyObject_Str: exports5.PyObject_Str,
        PyObject_Vectorcall: exports5.PyObject_Vectorcall,
        PyObject_VectorcallMethod: exports5.PyObject_VectorcallMethod,
        PySequence_Check: exports5.PySequence_Check,
        PySequence_Contains: exports5.PySequence_Contains,
        PySequence_Count: exports5.PySequence_Count,
        PySequence_DelItem: exports5.PySequence_DelItem,
        PySequence_Index: exports5.PySequence_Index,
        PySequence_List: exports5.PySequence_List,
        PySequence_SetItem: exports5.PySequence_SetItem,
        PySequence_Size: exports5.PySequence_Size,
        PySet_Add: exports5.PySet_Add,
        PySet_Contains: exports5.PySet_Contains,
        PySet_Discard: exports5.PySet_Discard,
        PySet_New: exports5.PySet_New,
        PySet_Pop: exports5.PySet_Pop,
        PySet_Size: exports5.PySet_Size,
        PySlice_AdjustIndices: exports5.PySlice_AdjustIndices,
        PySlice_New: exports5.PySlice_New,
        PySlice_Unpack: exports5.PySlice_Unpack,
        PyTraceBack_Print: exports5.PyTraceBack_Print,
        PyTuple_GetItem: exports5.PyTuple_GetItem,
        PyTuple_GetSlice: exports5.PyTuple_GetSlice,
        PyTuple_New: exports5.PyTuple_New,
        PyTuple_SetItem: exports5.PyTuple_SetItem,
        PyTuple_Size: exports5.PyTuple_Size,
        PyType_FromSpec: exports5.PyType_FromSpec,
        PyType_GenericAlloc: exports5.PyType_GenericAlloc,
        PyType_GetFlags: exports5.PyType_GetFlags,
        PyType_GetName: exports5.PyType_GetName,
        PyType_GetQualName: exports5.PyType_GetQualName,
        PyType_GetSlot: exports5.PyType_GetSlot,
        PyType_IsSubtype: exports5.PyType_IsSubtype,
        PyUnicodeDecodeError_Create: exports5.PyUnicodeDecodeError_Create,
        PyUnicode_AsEncodedString: exports5.PyUnicode_AsEncodedString,
        PyUnicode_AsUTF8AndSize: exports5.PyUnicode_AsUTF8AndSize,
        PyUnicode_AsUTF8String: exports5.PyUnicode_AsUTF8String,
        PyUnicode_DecodeFSDefaultAndSize: exports5.PyUnicode_DecodeFSDefaultAndSize,
        PyUnicode_EncodeFSDefault: exports5.PyUnicode_EncodeFSDefault,
        PyUnicode_FromEncodedObject: exports5.PyUnicode_FromEncodedObject,
        PyUnicode_FromStringAndSize: exports5.PyUnicode_FromStringAndSize,
        PyUnicode_InternInPlace: exports5.PyUnicode_InternInPlace,
        PyWeakref_GetObject: exports5.PyWeakref_GetObject,
        PyWeakref_NewProxy: exports5.PyWeakref_NewProxy,
        PyWeakref_NewRef: exports5.PyWeakref_NewRef,
        Py_CompileString: exports5.Py_CompileString,
        Py_GenericAlias: exports5.Py_GenericAlias,
        Py_GetVersion: exports5.Py_GetVersion,
        Py_InitializeEx: exports5.Py_InitializeEx,
        Py_IsInitialized: exports5.Py_IsInitialized,
        Py_NewRef: exports5.Py_NewRef,
        Py_XNewRef: exports5.Py_XNewRef,
        _Py_DecRef: exports5._Py_DecRef,
        _Py_IncRef: exports5._Py_IncRef,
        __indirect_function_table: exports5.__indirect_function_table,
        __memory_base: exports5['libcomponentize_py_runtime.so:memory_base'],
        __stack_pointer: exports5.__stack_pointer,
        __table_base: exports5['libcomponentize_py_runtime.so:table_base'],
        __wasilibc_find_relpath: exports5.__wasilibc_find_relpath,
        __wasilibc_get_environ: exports5.__wasilibc_get_environ,
        __wasilibc_reset_preopens: exports5.__wasilibc_reset_preopens,
        abort: exports5.abort,
        calloc: exports5.calloc,
        chdir: exports5.chdir,
        close: exports5.close,
        'componentize-py#CallIndirect': exports5['componentize-py#CallIndirect'],
        exit: exports5.exit,
        exp: exports5.exp,
        free: exports5.free,
        getcwd: exports5.getcwd,
        getenv: exports5.getenv,
        log: exports5.log,
        log2: exports5.log2,
        malloc: exports5.malloc,
        memcmp: exports5.memcmp,
        memory: exports5.memory,
        posix_memalign: exports5.posix_memalign,
        realloc: exports5.realloc,
        setenv: exports5.setenv,
        strerror_r: exports5.strerror_r,
        strlen: exports5.strlen,
        unsetenv: exports5.unsetenv,
      },
      'wasi:cli/environment@0.2.0': {
        'get-arguments': exports4['93'],
        'get-environment': exports4['94'],
      },
      wasi_snapshot_preview1: {
        args_get: exports5['wasi_snapshot_preview1:args_get'],
        args_sizes_get: exports5['wasi_snapshot_preview1:args_sizes_get'],
        clock_res_get: exports5['wasi_snapshot_preview1:clock_res_get'],
        clock_time_get: exports5['wasi_snapshot_preview1:clock_time_get'],
        environ_get: exports5['wasi_snapshot_preview1:environ_get'],
        environ_sizes_get: exports5['wasi_snapshot_preview1:environ_sizes_get'],
        fd_advise: exports5['wasi_snapshot_preview1:fd_advise'],
        fd_allocate: exports5['wasi_snapshot_preview1:fd_allocate'],
        fd_close: exports5['wasi_snapshot_preview1:fd_close'],
        fd_datasync: exports5['wasi_snapshot_preview1:fd_datasync'],
        fd_fdstat_get: exports5['wasi_snapshot_preview1:fd_fdstat_get'],
        fd_fdstat_set_flags: exports5['wasi_snapshot_preview1:fd_fdstat_set_flags'],
        fd_fdstat_set_rights: exports5['wasi_snapshot_preview1:fd_fdstat_set_rights'],
        fd_filestat_get: exports5['wasi_snapshot_preview1:fd_filestat_get'],
        fd_filestat_set_size: exports5['wasi_snapshot_preview1:fd_filestat_set_size'],
        fd_filestat_set_times: exports5['wasi_snapshot_preview1:fd_filestat_set_times'],
        fd_pread: exports5['wasi_snapshot_preview1:fd_pread'],
        fd_prestat_dir_name: exports5['wasi_snapshot_preview1:fd_prestat_dir_name'],
        fd_prestat_get: exports5['wasi_snapshot_preview1:fd_prestat_get'],
        fd_pwrite: exports5['wasi_snapshot_preview1:fd_pwrite'],
        fd_read: exports5['wasi_snapshot_preview1:fd_read'],
        fd_readdir: exports5['wasi_snapshot_preview1:fd_readdir'],
        fd_renumber: exports5['wasi_snapshot_preview1:fd_renumber'],
        fd_seek: exports5['wasi_snapshot_preview1:fd_seek'],
        fd_sync: exports5['wasi_snapshot_preview1:fd_sync'],
        fd_tell: exports5['wasi_snapshot_preview1:fd_tell'],
        fd_write: exports5['wasi_snapshot_preview1:fd_write'],
        path_create_directory: exports5['wasi_snapshot_preview1:path_create_directory'],
        path_filestat_get: exports5['wasi_snapshot_preview1:path_filestat_get'],
        path_filestat_set_times: exports5['wasi_snapshot_preview1:path_filestat_set_times'],
        path_link: exports5['wasi_snapshot_preview1:path_link'],
        path_open: exports5['wasi_snapshot_preview1:path_open'],
        path_readlink: exports5['wasi_snapshot_preview1:path_readlink'],
        path_remove_directory: exports5['wasi_snapshot_preview1:path_remove_directory'],
        path_rename: exports5['wasi_snapshot_preview1:path_rename'],
        path_symlink: exports5['wasi_snapshot_preview1:path_symlink'],
        path_unlink_file: exports5['wasi_snapshot_preview1:path_unlink_file'],
        poll_oneoff: exports5['wasi_snapshot_preview1:poll_oneoff'],
        proc_exit: exports5['wasi_snapshot_preview1:proc_exit'],
        proc_raise: exports5['wasi_snapshot_preview1:proc_raise'],
        random_get: exports5['wasi_snapshot_preview1:random_get'],
        reset_adapter_state: exports5['wasi_snapshot_preview1:reset_adapter_state'],
        sched_yield: exports5['wasi_snapshot_preview1:sched_yield'],
        sock_accept: exports5['wasi_snapshot_preview1:sock_accept'],
        sock_recv: exports5['wasi_snapshot_preview1:sock_recv'],
        sock_send: exports5['wasi_snapshot_preview1:sock_send'],
        sock_shutdown: exports5['wasi_snapshot_preview1:sock_shutdown'],
      },
    }));
    ({ exports: exports9 } = yield instantiateCore(yield module8, {
      'GOT.func': {
        PyByteArray_Concat: exports5['libpython3.14.so:PyByteArray_Concat'],
        PyDict_Contains: exports5['libpython3.14.so:PyDict_Contains'],
        PyInit__abc: exports5['libpython3.14.so:PyInit__abc'],
        PyInit__ast: exports5['libpython3.14.so:PyInit__ast'],
        PyInit__asyncio: exports5['libpython3.14.so:PyInit__asyncio'],
        PyInit__bisect: exports5['libpython3.14.so:PyInit__bisect'],
        PyInit__blake2: exports5['libpython3.14.so:PyInit__blake2'],
        PyInit__codecs: exports5['libpython3.14.so:PyInit__codecs'],
        PyInit__codecs_cn: exports5['libpython3.14.so:PyInit__codecs_cn'],
        PyInit__codecs_hk: exports5['libpython3.14.so:PyInit__codecs_hk'],
        PyInit__codecs_iso2022: exports5['libpython3.14.so:PyInit__codecs_iso2022'],
        PyInit__codecs_jp: exports5['libpython3.14.so:PyInit__codecs_jp'],
        PyInit__codecs_kr: exports5['libpython3.14.so:PyInit__codecs_kr'],
        PyInit__codecs_tw: exports5['libpython3.14.so:PyInit__codecs_tw'],
        PyInit__collections: exports5['libpython3.14.so:PyInit__collections'],
        PyInit__contextvars: exports5['libpython3.14.so:PyInit__contextvars'],
        PyInit__csv: exports5['libpython3.14.so:PyInit__csv'],
        PyInit__datetime: exports5['libpython3.14.so:PyInit__datetime'],
        PyInit__decimal: exports5['libpython3.14.so:PyInit__decimal'],
        PyInit__elementtree: exports5['libpython3.14.so:PyInit__elementtree'],
        PyInit__functools: exports5['libpython3.14.so:PyInit__functools'],
        PyInit__heapq: exports5['libpython3.14.so:PyInit__heapq'],
        PyInit__hmac: exports5['libpython3.14.so:PyInit__hmac'],
        PyInit__imp: exports5['libpython3.14.so:PyInit__imp'],
        PyInit__io: exports5['libpython3.14.so:PyInit__io'],
        PyInit__json: exports5['libpython3.14.so:PyInit__json'],
        PyInit__locale: exports5['libpython3.14.so:PyInit__locale'],
        PyInit__lsprof: exports5['libpython3.14.so:PyInit__lsprof'],
        PyInit__md5: exports5['libpython3.14.so:PyInit__md5'],
        PyInit__multibytecodec: exports5['libpython3.14.so:PyInit__multibytecodec'],
        PyInit__opcode: exports5['libpython3.14.so:PyInit__opcode'],
        PyInit__operator: exports5['libpython3.14.so:PyInit__operator'],
        PyInit__pickle: exports5['libpython3.14.so:PyInit__pickle'],
        PyInit__queue: exports5['libpython3.14.so:PyInit__queue'],
        PyInit__random: exports5['libpython3.14.so:PyInit__random'],
        PyInit__sha1: exports5['libpython3.14.so:PyInit__sha1'],
        PyInit__sha2: exports5['libpython3.14.so:PyInit__sha2'],
        PyInit__sha3: exports5['libpython3.14.so:PyInit__sha3'],
        PyInit__signal: exports5['libpython3.14.so:PyInit__signal'],
        PyInit__socket: exports5['libpython3.14.so:PyInit__socket'],
        PyInit__sre: exports5['libpython3.14.so:PyInit__sre'],
        PyInit__stat: exports5['libpython3.14.so:PyInit__stat'],
        PyInit__statistics: exports5['libpython3.14.so:PyInit__statistics'],
        PyInit__string: exports5['libpython3.14.so:PyInit__string'],
        PyInit__struct: exports5['libpython3.14.so:PyInit__struct'],
        PyInit__suggestions: exports5['libpython3.14.so:PyInit__suggestions'],
        PyInit__symtable: exports5['libpython3.14.so:PyInit__symtable'],
        PyInit__sysconfig: exports5['libpython3.14.so:PyInit__sysconfig'],
        PyInit__thread: exports5['libpython3.14.so:PyInit__thread'],
        PyInit__tokenize: exports5['libpython3.14.so:PyInit__tokenize'],
        PyInit__tracemalloc: exports5['libpython3.14.so:PyInit__tracemalloc'],
        PyInit__types: exports5['libpython3.14.so:PyInit__types'],
        PyInit__typing: exports5['libpython3.14.so:PyInit__typing'],
        PyInit__weakref: exports5['libpython3.14.so:PyInit__weakref'],
        PyInit__zoneinfo: exports5['libpython3.14.so:PyInit__zoneinfo'],
        PyInit_array: exports5['libpython3.14.so:PyInit_array'],
        PyInit_atexit: exports5['libpython3.14.so:PyInit_atexit'],
        PyInit_binascii: exports5['libpython3.14.so:PyInit_binascii'],
        PyInit_cmath: exports5['libpython3.14.so:PyInit_cmath'],
        PyInit_errno: exports5['libpython3.14.so:PyInit_errno'],
        PyInit_faulthandler: exports5['libpython3.14.so:PyInit_faulthandler'],
        PyInit_gc: exports5['libpython3.14.so:PyInit_gc'],
        PyInit_itertools: exports5['libpython3.14.so:PyInit_itertools'],
        PyInit_math: exports5['libpython3.14.so:PyInit_math'],
        PyInit_posix: exports5['libpython3.14.so:PyInit_posix'],
        PyInit_pyexpat: exports5['libpython3.14.so:PyInit_pyexpat'],
        PyInit_select: exports5['libpython3.14.so:PyInit_select'],
        PyInit_time: exports5['libpython3.14.so:PyInit_time'],
        PyInit_unicodedata: exports5['libpython3.14.so:PyInit_unicodedata'],
        PyInit_zlib: exports5['libpython3.14.so:PyInit_zlib'],
        PyMarshal_Init: exports5['libpython3.14.so:PyMarshal_Init'],
        PyMem_Free: exports5['libpython3.14.so:PyMem_Free'],
        PyMem_Malloc: exports5['libpython3.14.so:PyMem_Malloc'],
        PyMem_RawFree: exports5['libpython3.14.so:PyMem_RawFree'],
        PyMem_RawMalloc: exports5['libpython3.14.so:PyMem_RawMalloc'],
        PyMem_Realloc: exports5['libpython3.14.so:PyMem_Realloc'],
        PyNumber_Add: exports5['libpython3.14.so:PyNumber_Add'],
        PyNumber_And: exports5['libpython3.14.so:PyNumber_And'],
        PyNumber_FloorDivide: exports5['libpython3.14.so:PyNumber_FloorDivide'],
        PyNumber_InPlaceAdd: exports5['libpython3.14.so:PyNumber_InPlaceAdd'],
        PyNumber_InPlaceAnd: exports5['libpython3.14.so:PyNumber_InPlaceAnd'],
        PyNumber_InPlaceFloorDivide: exports5['libpython3.14.so:PyNumber_InPlaceFloorDivide'],
        PyNumber_InPlaceLshift: exports5['libpython3.14.so:PyNumber_InPlaceLshift'],
        PyNumber_InPlaceMatrixMultiply: exports5['libpython3.14.so:PyNumber_InPlaceMatrixMultiply'],
        PyNumber_InPlaceMultiply: exports5['libpython3.14.so:PyNumber_InPlaceMultiply'],
        PyNumber_InPlaceOr: exports5['libpython3.14.so:PyNumber_InPlaceOr'],
        PyNumber_InPlaceRemainder: exports5['libpython3.14.so:PyNumber_InPlaceRemainder'],
        PyNumber_InPlaceRshift: exports5['libpython3.14.so:PyNumber_InPlaceRshift'],
        PyNumber_InPlaceSubtract: exports5['libpython3.14.so:PyNumber_InPlaceSubtract'],
        PyNumber_InPlaceTrueDivide: exports5['libpython3.14.so:PyNumber_InPlaceTrueDivide'],
        PyNumber_InPlaceXor: exports5['libpython3.14.so:PyNumber_InPlaceXor'],
        PyNumber_Lshift: exports5['libpython3.14.so:PyNumber_Lshift'],
        PyNumber_MatrixMultiply: exports5['libpython3.14.so:PyNumber_MatrixMultiply'],
        PyNumber_Multiply: exports5['libpython3.14.so:PyNumber_Multiply'],
        PyNumber_Or: exports5['libpython3.14.so:PyNumber_Or'],
        PyNumber_Remainder: exports5['libpython3.14.so:PyNumber_Remainder'],
        PyNumber_Rshift: exports5['libpython3.14.so:PyNumber_Rshift'],
        PyNumber_Subtract: exports5['libpython3.14.so:PyNumber_Subtract'],
        PyNumber_TrueDivide: exports5['libpython3.14.so:PyNumber_TrueDivide'],
        PyNumber_Xor: exports5['libpython3.14.so:PyNumber_Xor'],
        PyObject_ASCII: exports5['libpython3.14.so:PyObject_ASCII'],
        PyObject_Free: exports5['libpython3.14.so:PyObject_Free'],
        PyObject_GC_Del: exports5['libpython3.14.so:PyObject_GC_Del'],
        PyObject_GenericGetAttr: exports5['libpython3.14.so:PyObject_GenericGetAttr'],
        PyObject_GenericGetDict: exports5['libpython3.14.so:PyObject_GenericGetDict'],
        PyObject_GenericHash: exports5['libpython3.14.so:PyObject_GenericHash'],
        PyObject_GenericSetAttr: exports5['libpython3.14.so:PyObject_GenericSetAttr'],
        PyObject_GenericSetDict: exports5['libpython3.14.so:PyObject_GenericSetDict'],
        PyObject_GetItem: exports5['libpython3.14.so:PyObject_GetItem'],
        PyObject_HashNotImplemented: exports5['libpython3.14.so:PyObject_HashNotImplemented'],
        PyObject_Repr: exports5['libpython3.14.so:PyObject_Repr'],
        PyObject_SelfIter: exports5['libpython3.14.so:PyObject_SelfIter'],
        PyObject_Str: exports5['libpython3.14.so:PyObject_Str'],
        PyType_GenericAlloc: exports5['libpython3.14.so:PyType_GenericAlloc'],
        PyType_GenericNew: exports5['libpython3.14.so:PyType_GenericNew'],
        PyUnicode_AsASCIIString: exports5['libpython3.14.so:PyUnicode_AsASCIIString'],
        PyUnicode_AsUTF8String: exports5['libpython3.14.so:PyUnicode_AsUTF8String'],
        PyUnicode_Concat: exports5['libpython3.14.so:PyUnicode_Concat'],
        PyUnicode_Contains: exports5['libpython3.14.so:PyUnicode_Contains'],
        PyUnicode_RichCompare: exports5['libpython3.14.so:PyUnicode_RichCompare'],
        PyVectorcall_Call: exports5['libpython3.14.so:PyVectorcall_Call'],
        Py_GenericAlias: exports5['libpython3.14.so:Py_GenericAlias'],
        _PyBytes_FromXIData: exports5['libpython3.14.so:_PyBytes_FromXIData'],
        _PyBytes_GetXIData: exports5['libpython3.14.so:_PyBytes_GetXIData'],
        _PyCode_FromXIData: exports5['libpython3.14.so:_PyCode_FromXIData'],
        _PyEval_EvalFrameDefault: exports5['libpython3.14.so:_PyEval_EvalFrameDefault'],
        _PyFunction_FromXIData: exports5['libpython3.14.so:_PyFunction_FromXIData'],
        _PyMarshal_ReadObjectFromXIData: exports5['libpython3.14.so:_PyMarshal_ReadObjectFromXIData'],
        _PyPickle_LoadFromXIData: exports5['libpython3.14.so:_PyPickle_LoadFromXIData'],
        _PyTime_gmtime: exports5['libpython3.14.so:_PyTime_gmtime'],
        _PyTime_localtime: exports5['libpython3.14.so:_PyTime_localtime'],
        _PyWarnings_Init: exports5['libpython3.14.so:_PyWarnings_Init'],
        _Py_hashtable_compare_direct: exports5['libpython3.14.so:_Py_hashtable_compare_direct'],
        _Py_hashtable_hash_ptr: exports5['libpython3.14.so:_Py_hashtable_hash_ptr'],
        _Py_union_type_or: exports5['libpython3.14.so:_Py_union_type_or'],
        __SIG_ERR: exports5['libpython3.14.so:__SIG_ERR'],
        __SIG_IGN: exports5['libpython3.14.so:__SIG_IGN'],
        acos: exports5['libpython3.14.so:acos'],
        asin: exports5['libpython3.14.so:asin'],
        atan: exports5['libpython3.14.so:atan'],
        atan2: exports5['libpython3.14.so:atan2'],
        calloc: exports5['libpython3.14.so:calloc'],
        copysign: exports5['libpython3.14.so:copysign'],
        cos: exports5['libpython3.14.so:cos'],
        cosh: exports5['libpython3.14.so:cosh'],
        exp2: exports5['libpython3.14.so:exp2'],
        fabs: exports5['libpython3.14.so:fabs'],
        free: exports5['libpython3.14.so:free'],
        malloc: exports5['libpython3.14.so:malloc'],
        realloc: exports5['libpython3.14.so:realloc'],
        sin: exports5['libpython3.14.so:sin'],
        sinh: exports5['libpython3.14.so:sinh'],
        sqrt: exports5['libpython3.14.so:sqrt'],
        tan: exports5['libpython3.14.so:tan'],
        tanh: exports5['libpython3.14.so:tanh'],
      },
      'GOT.mem': {
        PY_TIMEOUT_MAX: exports5['libpython3.14.so:PY_TIMEOUT_MAX'],
        PyAsyncGen_Type: exports5['libpython3.14.so:PyAsyncGen_Type'],
        PyBaseObject_Type: exports5['libpython3.14.so:PyBaseObject_Type'],
        PyBool_Type: exports5['libpython3.14.so:PyBool_Type'],
        PyByteArrayIter_Type: exports5['libpython3.14.so:PyByteArrayIter_Type'],
        PyByteArray_Type: exports5['libpython3.14.so:PyByteArray_Type'],
        PyBytesIter_Type: exports5['libpython3.14.so:PyBytesIter_Type'],
        PyBytes_Type: exports5['libpython3.14.so:PyBytes_Type'],
        PyCFunction_Type: exports5['libpython3.14.so:PyCFunction_Type'],
        PyCMethod_Type: exports5['libpython3.14.so:PyCMethod_Type'],
        PyCallIter_Type: exports5['libpython3.14.so:PyCallIter_Type'],
        PyCapsule_Type: exports5['libpython3.14.so:PyCapsule_Type'],
        PyCell_Type: exports5['libpython3.14.so:PyCell_Type'],
        PyClassMethodDescr_Type: exports5['libpython3.14.so:PyClassMethodDescr_Type'],
        PyClassMethod_Type: exports5['libpython3.14.so:PyClassMethod_Type'],
        PyCode_Type: exports5['libpython3.14.so:PyCode_Type'],
        PyComplex_Type: exports5['libpython3.14.so:PyComplex_Type'],
        PyContextToken_Type: exports5['libpython3.14.so:PyContextToken_Type'],
        PyContextVar_Type: exports5['libpython3.14.so:PyContextVar_Type'],
        PyContext_Type: exports5['libpython3.14.so:PyContext_Type'],
        PyCoro_Type: exports5['libpython3.14.so:PyCoro_Type'],
        PyDictItems_Type: exports5['libpython3.14.so:PyDictItems_Type'],
        PyDictIterItem_Type: exports5['libpython3.14.so:PyDictIterItem_Type'],
        PyDictIterKey_Type: exports5['libpython3.14.so:PyDictIterKey_Type'],
        PyDictIterValue_Type: exports5['libpython3.14.so:PyDictIterValue_Type'],
        PyDictKeys_Type: exports5['libpython3.14.so:PyDictKeys_Type'],
        PyDictProxy_Type: exports5['libpython3.14.so:PyDictProxy_Type'],
        PyDictRevIterItem_Type: exports5['libpython3.14.so:PyDictRevIterItem_Type'],
        PyDictRevIterKey_Type: exports5['libpython3.14.so:PyDictRevIterKey_Type'],
        PyDictRevIterValue_Type: exports5['libpython3.14.so:PyDictRevIterValue_Type'],
        PyDictValues_Type: exports5['libpython3.14.so:PyDictValues_Type'],
        PyDict_Type: exports5['libpython3.14.so:PyDict_Type'],
        PyEllipsis_Type: exports5['libpython3.14.so:PyEllipsis_Type'],
        PyEnum_Type: exports5['libpython3.14.so:PyEnum_Type'],
        PyExc_ArithmeticError: exports5['libpython3.14.so:PyExc_ArithmeticError'],
        PyExc_AssertionError: exports5['libpython3.14.so:PyExc_AssertionError'],
        PyExc_AttributeError: exports5['libpython3.14.so:PyExc_AttributeError'],
        PyExc_BaseException: exports5['libpython3.14.so:PyExc_BaseException'],
        PyExc_BaseExceptionGroup: exports5['libpython3.14.so:PyExc_BaseExceptionGroup'],
        PyExc_BlockingIOError: exports5['libpython3.14.so:PyExc_BlockingIOError'],
        PyExc_BrokenPipeError: exports5['libpython3.14.so:PyExc_BrokenPipeError'],
        PyExc_BufferError: exports5['libpython3.14.so:PyExc_BufferError'],
        PyExc_BytesWarning: exports5['libpython3.14.so:PyExc_BytesWarning'],
        PyExc_ChildProcessError: exports5['libpython3.14.so:PyExc_ChildProcessError'],
        PyExc_ConnectionAbortedError: exports5['libpython3.14.so:PyExc_ConnectionAbortedError'],
        PyExc_ConnectionRefusedError: exports5['libpython3.14.so:PyExc_ConnectionRefusedError'],
        PyExc_ConnectionResetError: exports5['libpython3.14.so:PyExc_ConnectionResetError'],
        PyExc_DeprecationWarning: exports5['libpython3.14.so:PyExc_DeprecationWarning'],
        PyExc_EOFError: exports5['libpython3.14.so:PyExc_EOFError'],
        PyExc_EncodingWarning: exports5['libpython3.14.so:PyExc_EncodingWarning'],
        PyExc_EnvironmentError: exports5['libpython3.14.so:PyExc_EnvironmentError'],
        PyExc_Exception: exports5['libpython3.14.so:PyExc_Exception'],
        PyExc_FileExistsError: exports5['libpython3.14.so:PyExc_FileExistsError'],
        PyExc_FileNotFoundError: exports5['libpython3.14.so:PyExc_FileNotFoundError'],
        PyExc_GeneratorExit: exports5['libpython3.14.so:PyExc_GeneratorExit'],
        PyExc_IOError: exports5['libpython3.14.so:PyExc_IOError'],
        PyExc_ImportError: exports5['libpython3.14.so:PyExc_ImportError'],
        PyExc_ImportWarning: exports5['libpython3.14.so:PyExc_ImportWarning'],
        PyExc_IndentationError: exports5['libpython3.14.so:PyExc_IndentationError'],
        PyExc_IndexError: exports5['libpython3.14.so:PyExc_IndexError'],
        PyExc_InterpreterError: exports5['libpython3.14.so:PyExc_InterpreterError'],
        PyExc_InterpreterNotFoundError: exports5['libpython3.14.so:PyExc_InterpreterNotFoundError'],
        PyExc_InterruptedError: exports5['libpython3.14.so:PyExc_InterruptedError'],
        PyExc_IsADirectoryError: exports5['libpython3.14.so:PyExc_IsADirectoryError'],
        PyExc_KeyError: exports5['libpython3.14.so:PyExc_KeyError'],
        PyExc_KeyboardInterrupt: exports5['libpython3.14.so:PyExc_KeyboardInterrupt'],
        PyExc_LookupError: exports5['libpython3.14.so:PyExc_LookupError'],
        PyExc_MemoryError: exports5['libpython3.14.so:PyExc_MemoryError'],
        PyExc_ModuleNotFoundError: exports5['libpython3.14.so:PyExc_ModuleNotFoundError'],
        PyExc_NameError: exports5['libpython3.14.so:PyExc_NameError'],
        PyExc_NotADirectoryError: exports5['libpython3.14.so:PyExc_NotADirectoryError'],
        PyExc_NotImplementedError: exports5['libpython3.14.so:PyExc_NotImplementedError'],
        PyExc_OSError: exports5['libpython3.14.so:PyExc_OSError'],
        PyExc_OverflowError: exports5['libpython3.14.so:PyExc_OverflowError'],
        PyExc_PendingDeprecationWarning: exports5['libpython3.14.so:PyExc_PendingDeprecationWarning'],
        PyExc_PermissionError: exports5['libpython3.14.so:PyExc_PermissionError'],
        PyExc_ProcessLookupError: exports5['libpython3.14.so:PyExc_ProcessLookupError'],
        PyExc_PythonFinalizationError: exports5['libpython3.14.so:PyExc_PythonFinalizationError'],
        PyExc_RecursionError: exports5['libpython3.14.so:PyExc_RecursionError'],
        PyExc_ReferenceError: exports5['libpython3.14.so:PyExc_ReferenceError'],
        PyExc_ResourceWarning: exports5['libpython3.14.so:PyExc_ResourceWarning'],
        PyExc_RuntimeError: exports5['libpython3.14.so:PyExc_RuntimeError'],
        PyExc_RuntimeWarning: exports5['libpython3.14.so:PyExc_RuntimeWarning'],
        PyExc_StopAsyncIteration: exports5['libpython3.14.so:PyExc_StopAsyncIteration'],
        PyExc_StopIteration: exports5['libpython3.14.so:PyExc_StopIteration'],
        PyExc_SyntaxError: exports5['libpython3.14.so:PyExc_SyntaxError'],
        PyExc_SyntaxWarning: exports5['libpython3.14.so:PyExc_SyntaxWarning'],
        PyExc_SystemError: exports5['libpython3.14.so:PyExc_SystemError'],
        PyExc_SystemExit: exports5['libpython3.14.so:PyExc_SystemExit'],
        PyExc_TabError: exports5['libpython3.14.so:PyExc_TabError'],
        PyExc_TimeoutError: exports5['libpython3.14.so:PyExc_TimeoutError'],
        PyExc_TypeError: exports5['libpython3.14.so:PyExc_TypeError'],
        PyExc_UnboundLocalError: exports5['libpython3.14.so:PyExc_UnboundLocalError'],
        PyExc_UnicodeDecodeError: exports5['libpython3.14.so:PyExc_UnicodeDecodeError'],
        PyExc_UnicodeEncodeError: exports5['libpython3.14.so:PyExc_UnicodeEncodeError'],
        PyExc_UnicodeError: exports5['libpython3.14.so:PyExc_UnicodeError'],
        PyExc_UnicodeTranslateError: exports5['libpython3.14.so:PyExc_UnicodeTranslateError'],
        PyExc_UserWarning: exports5['libpython3.14.so:PyExc_UserWarning'],
        PyExc_ValueError: exports5['libpython3.14.so:PyExc_ValueError'],
        PyExc_Warning: exports5['libpython3.14.so:PyExc_Warning'],
        PyExc_ZeroDivisionError: exports5['libpython3.14.so:PyExc_ZeroDivisionError'],
        PyFilter_Type: exports5['libpython3.14.so:PyFilter_Type'],
        PyFloat_Type: exports5['libpython3.14.so:PyFloat_Type'],
        PyFrameLocalsProxy_Type: exports5['libpython3.14.so:PyFrameLocalsProxy_Type'],
        PyFrame_Type: exports5['libpython3.14.so:PyFrame_Type'],
        PyFrozenSet_Type: exports5['libpython3.14.so:PyFrozenSet_Type'],
        PyFunction_Type: exports5['libpython3.14.so:PyFunction_Type'],
        PyGen_Type: exports5['libpython3.14.so:PyGen_Type'],
        PyGetSetDescr_Type: exports5['libpython3.14.so:PyGetSetDescr_Type'],
        PyImport_FrozenModules: exports5['libpython3.14.so:PyImport_FrozenModules'],
        PyImport_Inittab: exports5['libpython3.14.so:PyImport_Inittab'],
        PyInstanceMethod_Type: exports5['libpython3.14.so:PyInstanceMethod_Type'],
        PyListIter_Type: exports5['libpython3.14.so:PyListIter_Type'],
        PyListRevIter_Type: exports5['libpython3.14.so:PyListRevIter_Type'],
        PyList_Type: exports5['libpython3.14.so:PyList_Type'],
        PyLongRangeIter_Type: exports5['libpython3.14.so:PyLongRangeIter_Type'],
        PyLong_Type: exports5['libpython3.14.so:PyLong_Type'],
        PyMap_Type: exports5['libpython3.14.so:PyMap_Type'],
        PyMemberDescr_Type: exports5['libpython3.14.so:PyMemberDescr_Type'],
        PyMemoryView_Type: exports5['libpython3.14.so:PyMemoryView_Type'],
        PyMethodDescr_Type: exports5['libpython3.14.so:PyMethodDescr_Type'],
        PyMethod_Type: exports5['libpython3.14.so:PyMethod_Type'],
        PyModuleDef_Type: exports5['libpython3.14.so:PyModuleDef_Type'],
        PyModule_Type: exports5['libpython3.14.so:PyModule_Type'],
        PyODictItems_Type: exports5['libpython3.14.so:PyODictItems_Type'],
        PyODictIter_Type: exports5['libpython3.14.so:PyODictIter_Type'],
        PyODictKeys_Type: exports5['libpython3.14.so:PyODictKeys_Type'],
        PyODictValues_Type: exports5['libpython3.14.so:PyODictValues_Type'],
        PyODict_Type: exports5['libpython3.14.so:PyODict_Type'],
        PyOS_InputHook: exports5['libpython3.14.so:PyOS_InputHook'],
        PyOS_ReadlineFunctionPointer: exports5['libpython3.14.so:PyOS_ReadlineFunctionPointer'],
        PyPickleBuffer_Type: exports5['libpython3.14.so:PyPickleBuffer_Type'],
        PyProperty_Type: exports5['libpython3.14.so:PyProperty_Type'],
        PyRangeIter_Type: exports5['libpython3.14.so:PyRangeIter_Type'],
        PyRange_Type: exports5['libpython3.14.so:PyRange_Type'],
        PyReversed_Type: exports5['libpython3.14.so:PyReversed_Type'],
        PySeqIter_Type: exports5['libpython3.14.so:PySeqIter_Type'],
        PySetIter_Type: exports5['libpython3.14.so:PySetIter_Type'],
        PySet_Type: exports5['libpython3.14.so:PySet_Type'],
        PySlice_Type: exports5['libpython3.14.so:PySlice_Type'],
        PyStaticMethod_Type: exports5['libpython3.14.so:PyStaticMethod_Type'],
        PyStdPrinter_Type: exports5['libpython3.14.so:PyStdPrinter_Type'],
        PyStructSequence_UnnamedField: exports5['libpython3.14.so:PyStructSequence_UnnamedField'],
        PySuper_Type: exports5['libpython3.14.so:PySuper_Type'],
        PyTraceBack_Type: exports5['libpython3.14.so:PyTraceBack_Type'],
        PyTupleIter_Type: exports5['libpython3.14.so:PyTupleIter_Type'],
        PyTuple_Type: exports5['libpython3.14.so:PyTuple_Type'],
        PyType_Type: exports5['libpython3.14.so:PyType_Type'],
        PyUnicodeIter_Type: exports5['libpython3.14.so:PyUnicodeIter_Type'],
        PyUnicode_Type: exports5['libpython3.14.so:PyUnicode_Type'],
        PyWrapperDescr_Type: exports5['libpython3.14.so:PyWrapperDescr_Type'],
        PyZip_Type: exports5['libpython3.14.so:PyZip_Type'],
        Py_BytesWarningFlag: exports5['libpython3.14.so:Py_BytesWarningFlag'],
        Py_DebugFlag: exports5['libpython3.14.so:Py_DebugFlag'],
        Py_DontWriteBytecodeFlag: exports5['libpython3.14.so:Py_DontWriteBytecodeFlag'],
        Py_FileSystemDefaultEncodeErrors: exports5['libpython3.14.so:Py_FileSystemDefaultEncodeErrors'],
        Py_FileSystemDefaultEncoding: exports5['libpython3.14.so:Py_FileSystemDefaultEncoding'],
        Py_FrozenFlag: exports5['libpython3.14.so:Py_FrozenFlag'],
        Py_GenericAliasType: exports5['libpython3.14.so:Py_GenericAliasType'],
        Py_HasFileSystemDefaultEncoding: exports5['libpython3.14.so:Py_HasFileSystemDefaultEncoding'],
        Py_HashRandomizationFlag: exports5['libpython3.14.so:Py_HashRandomizationFlag'],
        Py_IgnoreEnvironmentFlag: exports5['libpython3.14.so:Py_IgnoreEnvironmentFlag'],
        Py_InspectFlag: exports5['libpython3.14.so:Py_InspectFlag'],
        Py_InteractiveFlag: exports5['libpython3.14.so:Py_InteractiveFlag'],
        Py_IsolatedFlag: exports5['libpython3.14.so:Py_IsolatedFlag'],
        Py_NoSiteFlag: exports5['libpython3.14.so:Py_NoSiteFlag'],
        Py_NoUserSiteDirectory: exports5['libpython3.14.so:Py_NoUserSiteDirectory'],
        Py_OptimizeFlag: exports5['libpython3.14.so:Py_OptimizeFlag'],
        Py_QuietFlag: exports5['libpython3.14.so:Py_QuietFlag'],
        Py_UTF8Mode: exports5['libpython3.14.so:Py_UTF8Mode'],
        Py_UnbufferedStdioFlag: exports5['libpython3.14.so:Py_UnbufferedStdioFlag'],
        Py_VerboseFlag: exports5['libpython3.14.so:Py_VerboseFlag'],
        Py_hexdigits: exports5['libpython3.14.so:Py_hexdigits'],
        _CLOCK_MONOTONIC: exports5['libpython3.14.so:_CLOCK_MONOTONIC'],
        _CLOCK_REALTIME: exports5['libpython3.14.so:_CLOCK_REALTIME'],
        _PyAsyncGenASend_Type: exports5['libpython3.14.so:_PyAsyncGenASend_Type'],
        _PyByteArray_empty_string: exports5['libpython3.14.so:_PyByteArray_empty_string'],
        _PyEval_BinaryOps: exports5['libpython3.14.so:_PyEval_BinaryOps'],
        _PyEval_ConversionFuncs: exports5['libpython3.14.so:_PyEval_ConversionFuncs'],
        _PyExc_IncompleteInputError: exports5['libpython3.14.so:_PyExc_IncompleteInputError'],
        _PyImport_FrozenBootstrap: exports5['libpython3.14.so:_PyImport_FrozenBootstrap'],
        _PyImport_FrozenStdlib: exports5['libpython3.14.so:_PyImport_FrozenStdlib'],
        _PyImport_FrozenTest: exports5['libpython3.14.so:_PyImport_FrozenTest'],
        _PyIntrinsics_BinaryFunctions: exports5['libpython3.14.so:_PyIntrinsics_BinaryFunctions'],
        _PyIntrinsics_UnaryFunctions: exports5['libpython3.14.so:_PyIntrinsics_UnaryFunctions'],
        _PyLong_DigitValue: exports5['libpython3.14.so:_PyLong_DigitValue'],
        _PyNone_Type: exports5['libpython3.14.so:_PyNone_Type'],
        _PyNotImplemented_Type: exports5['libpython3.14.so:_PyNotImplemented_Type'],
        _PyOS_ReadlineTState: exports5['libpython3.14.so:_PyOS_ReadlineTState'],
        _PyRuntime: exports5['libpython3.14.so:_PyRuntime'],
        _PyUnion_Type: exports5['libpython3.14.so:_PyUnion_Type'],
        _PyWeakref_CallableProxyType: exports5['libpython3.14.so:_PyWeakref_CallableProxyType'],
        _PyWeakref_ProxyType: exports5['libpython3.14.so:_PyWeakref_ProxyType'],
        _PyWeakref_RefType: exports5['libpython3.14.so:_PyWeakref_RefType'],
        _Py_EllipsisObject: exports5['libpython3.14.so:_Py_EllipsisObject'],
        _Py_FalseStruct: exports5['libpython3.14.so:_Py_FalseStruct'],
        _Py_FunctionAttributeOffsets: exports5['libpython3.14.so:_Py_FunctionAttributeOffsets'],
        _Py_HashSecret: exports5['libpython3.14.so:_Py_HashSecret'],
        _Py_InitCleanup: exports5['libpython3.14.so:_Py_InitCleanup'],
        _Py_NoneStruct: exports5['libpython3.14.so:_Py_NoneStruct'],
        _Py_NotImplementedStruct: exports5['libpython3.14.so:_Py_NotImplementedStruct'],
        _Py_SpecialMethods: exports5['libpython3.14.so:_Py_SpecialMethods'],
        _Py_SwappedOp: exports5['libpython3.14.so:_Py_SwappedOp'],
        _Py_TrueStruct: exports5['libpython3.14.so:_Py_TrueStruct'],
        _Py_ascii_whitespace: exports5['libpython3.14.so:_Py_ascii_whitespace'],
        _Py_ctype_table: exports5['libpython3.14.so:_Py_ctype_table'],
        _Py_ctype_tolower: exports5['libpython3.14.so:_Py_ctype_tolower'],
        _Py_ctype_toupper: exports5['libpython3.14.so:_Py_ctype_toupper'],
        environ: exports5['libpython3.14.so:environ'],
        errno: exports5['libpython3.14.so:errno'],
        h_errno: exports5['libpython3.14.so:h_errno'],
        stderr: exports5['libpython3.14.so:stderr'],
        stdin: exports5['libpython3.14.so:stdin'],
        stdout: exports5['libpython3.14.so:stdout'],
      },
      env: {
        __SIG_ERR: exports5.__SIG_ERR,
        __SIG_IGN: exports5.__SIG_IGN,
        __indirect_function_table: exports5.__indirect_function_table,
        __memory_base: exports5['libpython3.14.so:memory_base'],
        __stack_pointer: exports5.__stack_pointer,
        __table_base: exports5['libpython3.14.so:table_base'],
        __wasilibc_tell: exports5.__wasilibc_tell,
        _exit: exports5._exit,
        abort: exports5.abort,
        accept: exports5.accept,
        accept4: exports5.accept4,
        access: exports5.access,
        acos: exports5.acos,
        acosh: exports5.acosh,
        asin: exports5.asin,
        asinh: exports5.asinh,
        atan: exports5.atan,
        atan2: exports5.atan2,
        atanh: exports5.atanh,
        atexit: exports5.atexit,
        bind: exports5.bind,
        calloc: exports5.calloc,
        cbrt: exports5.cbrt,
        chdir: exports5.chdir,
        clearerr: exports5.clearerr,
        clock: exports5.clock,
        clock_getres: exports5.clock_getres,
        clock_gettime: exports5.clock_gettime,
        clock_nanosleep: exports5.clock_nanosleep,
        close: exports5.close,
        closedir: exports5.closedir,
        confstr: exports5.confstr,
        connect: exports5.connect,
        copysign: exports5.copysign,
        cos: exports5.cos,
        cosh: exports5.cosh,
        dlerror: exports5.dlerror,
        dlopen: exports5.dlopen,
        dlsym: exports5.dlsym,
        erf: exports5.erf,
        erfc: exports5.erfc,
        exit: exports5.exit,
        exp: exports5.exp,
        exp2: exports5.exp2,
        expm1: exports5.expm1,
        fabs: exports5.fabs,
        faccessat: exports5.faccessat,
        fclose: exports5.fclose,
        fcntl: exports5.fcntl,
        fdatasync: exports5.fdatasync,
        fdopen: exports5.fdopen,
        feof: exports5.feof,
        ferror: exports5.ferror,
        fflush: exports5.fflush,
        fgets: exports5.fgets,
        fileno: exports5.fileno,
        fma: exports5.fma,
        fmod: exports5.fmod,
        fopen: exports5.fopen,
        fopencookie: exports5.fopencookie,
        fpathconf: exports5.fpathconf,
        fprintf: exports5.fprintf,
        fputc: exports5.fputc,
        fputs: exports5.fputs,
        fread: exports5.fread,
        free: exports5.free,
        freeaddrinfo: exports5.freeaddrinfo,
        frexp: exports5.frexp,
        fstat: exports5.fstat,
        fstatat: exports5.fstatat,
        fsync: exports5.fsync,
        ftell: exports5.ftell,
        ftruncate: exports5.ftruncate,
        futimens: exports5.futimens,
        fwrite: exports5.fwrite,
        gai_strerror: exports5.gai_strerror,
        getaddrinfo: exports5.getaddrinfo,
        getc: exports5.getc,
        getcwd: exports5.getcwd,
        getentropy: exports5.getentropy,
        getenv: exports5.getenv,
        gethostbyaddr: exports5.gethostbyaddr,
        gethostbyname: exports5.gethostbyname,
        getnameinfo: exports5.getnameinfo,
        getpeername: exports5.getpeername,
        getpid: exports5.getpid,
        getprotobyname: exports5.getprotobyname,
        getservbyname: exports5.getservbyname,
        getservbyport: exports5.getservbyport,
        getsockname: exports5.getsockname,
        getsockopt: exports5.getsockopt,
        gettimeofday: exports5.gettimeofday,
        gmtime_r: exports5.gmtime_r,
        hstrerror: exports5.hstrerror,
        htonl: exports5.htonl,
        htons: exports5.htons,
        hypot: exports5.hypot,
        inet_aton: exports5.inet_aton,
        inet_ntop: exports5.inet_ntop,
        inet_pton: exports5.inet_pton,
        ioctl: exports5.ioctl,
        isalnum: exports5.isalnum,
        isatty: exports5.isatty,
        ldexp: exports5.ldexp,
        link: exports5.link,
        listen: exports5.listen,
        localeconv: exports5.localeconv,
        localtime_r: exports5.localtime_r,
        log: exports5.log,
        log10: exports5.log10,
        log1p: exports5.log1p,
        log2: exports5.log2,
        lseek: exports5.lseek,
        lstat: exports5.lstat,
        malloc: exports5.malloc,
        mbrtowc: exports5.mbrtowc,
        mbstowcs: exports5.mbstowcs,
        memchr: exports5.memchr,
        memcmp: exports5.memcmp,
        memory: exports5.memory,
        memrchr: exports5.memrchr,
        mkdir: exports5.mkdir,
        mkdirat: exports5.mkdirat,
        mktime: exports5.mktime,
        modf: exports5.modf,
        nextafter: exports5.nextafter,
        nl_langinfo: exports5.nl_langinfo,
        ntohl: exports5.ntohl,
        ntohs: exports5.ntohs,
        open: exports5.open,
        openat: exports5.openat,
        opendir: exports5.opendir,
        pathconf: exports5.pathconf,
        poll: exports5.poll,
        posix_fadvise: exports5.posix_fadvise,
        pow: exports5.pow,
        pread: exports5.pread,
        printf: exports5.printf,
        pthread_attr_destroy: exports5.pthread_attr_destroy,
        pthread_attr_getguardsize: exports5.pthread_attr_getguardsize,
        pthread_attr_getstack: exports5.pthread_attr_getstack,
        pthread_attr_init: exports5.pthread_attr_init,
        pthread_attr_setstacksize: exports5.pthread_attr_setstacksize,
        pthread_cond_destroy: exports5.pthread_cond_destroy,
        pthread_cond_init: exports5.pthread_cond_init,
        pthread_cond_signal: exports5.pthread_cond_signal,
        pthread_cond_timedwait: exports5.pthread_cond_timedwait,
        pthread_cond_wait: exports5.pthread_cond_wait,
        pthread_condattr_init: exports5.pthread_condattr_init,
        pthread_condattr_setclock: exports5.pthread_condattr_setclock,
        pthread_create: exports5.pthread_create,
        pthread_detach: exports5.pthread_detach,
        pthread_getattr_np: exports5.pthread_getattr_np,
        pthread_getspecific: exports5.pthread_getspecific,
        pthread_join: exports5.pthread_join,
        pthread_key_create: exports5.pthread_key_create,
        pthread_key_delete: exports5.pthread_key_delete,
        pthread_mutex_destroy: exports5.pthread_mutex_destroy,
        pthread_mutex_init: exports5.pthread_mutex_init,
        pthread_mutex_lock: exports5.pthread_mutex_lock,
        pthread_mutex_trylock: exports5.pthread_mutex_trylock,
        pthread_mutex_unlock: exports5.pthread_mutex_unlock,
        pthread_self: exports5.pthread_self,
        pthread_setspecific: exports5.pthread_setspecific,
        putchar: exports5.putchar,
        puts: exports5.puts,
        pwrite: exports5.pwrite,
        raise: exports5.raise,
        read: exports5.read,
        readdir: exports5.readdir,
        readlink: exports5.readlink,
        readlinkat: exports5.readlinkat,
        realloc: exports5.realloc,
        realpath: exports5.realpath,
        recv: exports5.recv,
        recvfrom: exports5.recvfrom,
        rename: exports5.rename,
        renameat: exports5.renameat,
        rewind: exports5.rewind,
        rmdir: exports5.rmdir,
        round: exports5.round,
        sbrk: exports5.sbrk,
        sched_yield: exports5.sched_yield,
        select: exports5.select,
        send: exports5.send,
        sendto: exports5.sendto,
        setenv: exports5.setenv,
        setlocale: exports5.setlocale,
        setsockopt: exports5.setsockopt,
        setvbuf: exports5.setvbuf,
        shutdown: exports5.shutdown,
        signal: exports5.signal,
        sin: exports5.sin,
        sinh: exports5.sinh,
        sleep: exports5.sleep,
        snprintf: exports5.snprintf,
        socket: exports5.socket,
        sprintf: exports5.sprintf,
        sqrt: exports5.sqrt,
        stat: exports5.stat,
        strchr: exports5.strchr,
        strcmp: exports5.strcmp,
        strcpy: exports5.strcpy,
        strcspn: exports5.strcspn,
        strdup: exports5.strdup,
        strerror: exports5.strerror,
        strlen: exports5.strlen,
        strncat: exports5.strncat,
        strncmp: exports5.strncmp,
        strncpy: exports5.strncpy,
        strpbrk: exports5.strpbrk,
        strrchr: exports5.strrchr,
        strsignal: exports5.strsignal,
        strstr: exports5.strstr,
        strtol: exports5.strtol,
        strtoul: exports5.strtoul,
        symlink: exports5.symlink,
        symlinkat: exports5.symlinkat,
        sysconf: exports5.sysconf,
        tan: exports5.tan,
        tanh: exports5.tanh,
        time: exports5.time,
        times: exports5.times,
        tolower: exports5.tolower,
        toupper: exports5.toupper,
        truncate: exports5.truncate,
        uname: exports5.uname,
        ungetc: exports5.ungetc,
        unlink: exports5.unlink,
        unlinkat: exports5.unlinkat,
        unsetenv: exports5.unsetenv,
        utimensat: exports5.utimensat,
        vfprintf: exports5.vfprintf,
        vsnprintf: exports5.vsnprintf,
        wcschr: exports5.wcschr,
        wcscmp: exports5.wcscmp,
        wcscoll: exports5.wcscoll,
        wcscpy: exports5.wcscpy,
        wcsftime: exports5.wcsftime,
        wcslen: exports5.wcslen,
        wcsncmp: exports5.wcsncmp,
        wcsncpy: exports5.wcsncpy,
        wcsrchr: exports5.wcsrchr,
        wcstok: exports5.wcstok,
        wcstol: exports5.wcstol,
        wcstombs: exports5.wcstombs,
        wcsxfrm: exports5.wcsxfrm,
        wmemchr: exports5.wmemchr,
        wmemcmp: exports5.wmemcmp,
        write: exports5.write,
      },
    }));
    ({ exports: exports10 } = yield instantiateCore(yield module9, {
      'GOT.func': {
        __SIG_ERR: exports5['libwasi-emulated-signal.so:__SIG_ERR'],
        __SIG_IGN: exports5['libwasi-emulated-signal.so:__SIG_IGN'],
      },
      'GOT.mem': {
        errno: exports5['libwasi-emulated-signal.so:errno'],
        stderr: exports5['libwasi-emulated-signal.so:stderr'],
      },
      env: {
        __indirect_function_table: exports5.__indirect_function_table,
        __lctrans_cur: exports5.__lctrans_cur,
        __memory_base: exports5['libwasi-emulated-signal.so:memory_base'],
        __stack_pointer: exports5.__stack_pointer,
        __sysv_signal: exports5.__sysv_signal,
        __table_base: exports5['libwasi-emulated-signal.so:table_base'],
        abort: exports5.abort,
        bsd_signal: exports5.bsd_signal,
        fprintf: exports5.fprintf,
        memory: exports5.memory,
      },
    }));
    ({ exports: exports11 } = yield instantiateCore(yield module10, {
      'GOT.func': {
        __wasilibc_find_relpath_alloc: exports5['libc.so:__wasilibc_find_relpath_alloc'],
      },
      'GOT.mem': {
        _CLOCK_REALTIME: exports5['libc.so:_CLOCK_REALTIME'],
        __heap_base: exports5.__heap_base,
        __heap_end: exports5.__heap_end,
        __optpos: exports5['libc.so:__optpos'],
        __optreset: exports5['libc.so:__optreset'],
        __signgam: exports5['libc.so:__signgam'],
        __stack_chk_guard: exports5['libc.so:__stack_chk_guard'],
        __wasi_sockets_services_db: exports5['libc.so:__wasi_sockets_services_db'],
        __wasilibc_cwd: exports5['libc.so:__wasilibc_cwd'],
        __wasilibc_environ: exports5['libc.so:__wasilibc_environ'],
        __wasilibc_pthread_self: exports5['libc.so:__wasilibc_pthread_self'],
        errno: exports5['libc.so:errno'],
        getdate_err: exports5['libc.so:getdate_err'],
        optarg: exports5['libc.so:optarg'],
        opterr: exports5['libc.so:opterr'],
        optind: exports5['libc.so:optind'],
        optopt: exports5['libc.so:optopt'],
      },
      env: {
        _IO_feof_unlocked: exports5._IO_feof_unlocked,
        _IO_ferror_unlocked: exports5._IO_ferror_unlocked,
        _IO_getc: exports5._IO_getc,
        _IO_getc_unlocked: exports5._IO_getc_unlocked,
        _IO_putc: exports5._IO_putc,
        _IO_putc_unlocked: exports5._IO_putc_unlocked,
        __freelocale: exports5.__freelocale,
        __getdelim: exports5.__getdelim,
        __indirect_function_table: exports5.__indirect_function_table,
        __isoc99_fscanf: exports5.__isoc99_fscanf,
        __isoc99_fwscanf: exports5.__isoc99_fwscanf,
        __isoc99_scanf: exports5.__isoc99_scanf,
        __isoc99_sscanf: exports5.__isoc99_sscanf,
        __isoc99_swscanf: exports5.__isoc99_swscanf,
        __isoc99_vfscanf: exports5.__isoc99_vfscanf,
        __isoc99_vfwscanf: exports5.__isoc99_vfwscanf,
        __isoc99_vscanf: exports5.__isoc99_vscanf,
        __isoc99_vsscanf: exports5.__isoc99_vsscanf,
        __isoc99_vswscanf: exports5.__isoc99_vswscanf,
        __isoc99_vwscanf: exports5.__isoc99_vwscanf,
        __isoc99_wscanf: exports5.__isoc99_wscanf,
        __main_argc_argv: exports7.__main_argc_argv,
        __main_void: exports5.__main_void,
        __memory_base: exports5['libc.so:memory_base'],
        __posix_getopt: exports5.__posix_getopt,
        __small_printf: exports5.__small_printf,
        __stack_pointer: exports5.__stack_pointer,
        __strtod_l: exports5.__strtod_l,
        __strtof_l: exports5.__strtof_l,
        __strtoimax_internal: exports5.__strtoimax_internal,
        __strtol_internal: exports5.__strtol_internal,
        __strtold_l: exports5.__strtold_l,
        __strtoll_internal: exports5.__strtoll_internal,
        __strtoul_internal: exports5.__strtoul_internal,
        __strtoull_internal: exports5.__strtoull_internal,
        __strtoumax_internal: exports5.__strtoumax_internal,
        __table_base: exports5['libc.so:table_base'],
        __wasilibc_find_relpath_alloc: exports5.__wasilibc_find_relpath_alloc,
        __xpg_basename: exports5.__xpg_basename,
        __xpg_strerror_r: exports5.__xpg_strerror_r,
        alphasort64: exports5.alphasort64,
        asctime_r: exports5.asctime_r,
        cabi_realloc: exports8.cabi_realloc,
        clearerr_unlocked: exports5.clearerr_unlocked,
        clock_gettime: exports5.clock_gettime,
        creat64: exports5.creat64,
        crypt_r: exports5.crypt_r,
        drem: exports5.drem,
        dremf: exports5.dremf,
        duplocale: exports5.duplocale,
        fdopen: exports5.fdopen,
        feof_unlocked: exports5.feof_unlocked,
        ferror_unlocked: exports5.ferror_unlocked,
        fflush_unlocked: exports5.fflush_unlocked,
        fgetc_unlocked: exports5.fgetc_unlocked,
        fgetpos64: exports5.fgetpos64,
        fgets_unlocked: exports5.fgets_unlocked,
        fgetwc_unlocked: exports5.fgetwc_unlocked,
        fgetws_unlocked: exports5.fgetws_unlocked,
        fileno_unlocked: exports5.fileno_unlocked,
        fopen64: exports5.fopen64,
        fpurge: exports5.fpurge,
        fputc_unlocked: exports5.fputc_unlocked,
        fputs_unlocked: exports5.fputs_unlocked,
        fputwc_unlocked: exports5.fputwc_unlocked,
        fputws_unlocked: exports5.fputws_unlocked,
        fread_unlocked: exports5.fread_unlocked,
        freopen64: exports5.freopen64,
        fseeko: exports5.fseeko,
        fseeko64: exports5.fseeko64,
        fsetpos64: exports5.fsetpos64,
        ftello: exports5.ftello,
        ftello64: exports5.ftello64,
        futimesat: exports5.futimesat,
        fwrite_unlocked: exports5.fwrite_unlocked,
        getentropy: exports5.getentropy,
        getwc_unlocked: exports5.getwc_unlocked,
        getwchar_unlocked: exports5.getwchar_unlocked,
        glob64: exports5.glob64,
        globfree64: exports5.globfree64,
        gmtime_r: exports5.gmtime_r,
        hcreate_r: exports5.hcreate_r,
        hdestroy_r: exports5.hdestroy_r,
        hsearch_r: exports5.hsearch_r,
        inet_aton: exports5.inet_aton,
        iprintf: exports5.iprintf,
        isalnum_l: exports5.isalnum_l,
        isalpha_l: exports5.isalpha_l,
        isatty: exports5.isatty,
        isblank_l: exports5.isblank_l,
        iscntrl_l: exports5.iscntrl_l,
        isdigit_l: exports5.isdigit_l,
        isgraph_l: exports5.isgraph_l,
        islower_l: exports5.islower_l,
        isprint_l: exports5.isprint_l,
        ispunct_l: exports5.ispunct_l,
        isspace_l: exports5.isspace_l,
        isupper_l: exports5.isupper_l,
        iswalnum_l: exports5.iswalnum_l,
        iswalpha_l: exports5.iswalpha_l,
        iswblank_l: exports5.iswblank_l,
        iswcntrl_l: exports5.iswcntrl_l,
        iswctype_l: exports5.iswctype_l,
        iswdigit_l: exports5.iswdigit_l,
        iswgraph_l: exports5.iswgraph_l,
        iswlower_l: exports5.iswlower_l,
        iswprint_l: exports5.iswprint_l,
        iswpunct_l: exports5.iswpunct_l,
        iswspace_l: exports5.iswspace_l,
        iswupper_l: exports5.iswupper_l,
        iswxdigit_l: exports5.iswxdigit_l,
        isxdigit_l: exports5.isxdigit_l,
        lgamma_r: exports5.lgamma_r,
        lgammaf_r: exports5.lgammaf_r,
        lgammal_r: exports5.lgammal_r,
        localtime_r: exports5.localtime_r,
        lseek: exports5.lseek,
        memory: exports5.memory,
        memrchr: exports5.memrchr,
        newlocale: exports5.newlocale,
        nftw64: exports5.nftw64,
        nl_langinfo: exports5.nl_langinfo,
        nl_langinfo_l: exports5.nl_langinfo_l,
        pow10: exports5.pow10,
        pow10f: exports5.pow10f,
        pow10l: exports5.pow10l,
        pthread_cond_timedwait: exports5.pthread_cond_timedwait,
        pthread_create: exports5.pthread_create,
        pthread_detach: exports5.pthread_detach,
        pthread_equal: exports5.pthread_equal,
        pthread_getspecific: exports5.pthread_getspecific,
        pthread_join: exports5.pthread_join,
        pthread_key_create: exports5.pthread_key_create,
        pthread_key_delete: exports5.pthread_key_delete,
        pthread_mutex_lock: exports5.pthread_mutex_lock,
        pthread_mutex_timedlock: exports5.pthread_mutex_timedlock,
        pthread_mutex_trylock: exports5.pthread_mutex_trylock,
        pthread_mutex_unlock: exports5.pthread_mutex_unlock,
        pthread_once: exports5.pthread_once,
        pthread_rwlock_rdlock: exports5.pthread_rwlock_rdlock,
        pthread_rwlock_timedrdlock: exports5.pthread_rwlock_timedrdlock,
        pthread_rwlock_timedwrlock: exports5.pthread_rwlock_timedwrlock,
        pthread_rwlock_tryrdlock: exports5.pthread_rwlock_tryrdlock,
        pthread_rwlock_trywrlock: exports5.pthread_rwlock_trywrlock,
        pthread_rwlock_unlock: exports5.pthread_rwlock_unlock,
        pthread_rwlock_wrlock: exports5.pthread_rwlock_wrlock,
        pthread_self: exports5.pthread_self,
        pthread_setcancelstate: exports5.pthread_setcancelstate,
        pthread_testcancel: exports5.pthread_testcancel,
        pthread_timedjoin_np: exports5.pthread_timedjoin_np,
        pthread_tryjoin_np: exports5.pthread_tryjoin_np,
        putwc_unlocked: exports5.putwc_unlocked,
        putwchar_unlocked: exports5.putwchar_unlocked,
        qsort_r: exports5.qsort_r,
        reallocarray: exports5.reallocarray,
        stpcpy: exports5.stpcpy,
        stpncpy: exports5.stpncpy,
        strcasecmp_l: exports5.strcasecmp_l,
        strchrnul: exports5.strchrnul,
        strcoll_l: exports5.strcoll_l,
        strerror_l: exports5.strerror_l,
        strftime_l: exports5.strftime_l,
        strncasecmp_l: exports5.strncasecmp_l,
        strxfrm_l: exports5.strxfrm_l,
        thrd_current: exports5.thrd_current,
        thrd_detach: exports5.thrd_detach,
        thrd_equal: exports5.thrd_equal,
        tolower_l: exports5.tolower_l,
        toupper_l: exports5.toupper_l,
        towctrans_l: exports5.towctrans_l,
        towlower_l: exports5.towlower_l,
        towupper_l: exports5.towupper_l,
        tss_get: exports5.tss_get,
        uselocale: exports5.uselocale,
        versionsort64: exports5.versionsort64,
        wcscoll_l: exports5.wcscoll_l,
        wcsftime_l: exports5.wcsftime_l,
        wcsxfrm_l: exports5.wcsxfrm_l,
        wctrans_l: exports5.wctrans_l,
        wctype_l: exports5.wctype_l,
      },
      'wasi:cli/environment@0.2.0': {
        'get-arguments': exports4['180'],
        'get-environment': exports4['179'],
        'initial-cwd': exports4['181'],
      },
      'wasi:cli/exit@0.2.0': {
        exit: trampoline48,
      },
      'wasi:cli/stderr@0.2.0': {
        'get-stderr': trampoline47,
      },
      'wasi:cli/stdin@0.2.0': {
        'get-stdin': trampoline49,
      },
      'wasi:cli/stdout@0.2.0': {
        'get-stdout': trampoline50,
      },
      'wasi:cli/terminal-input@0.2.0': {
        '[resource-drop]terminal-input': trampoline46,
      },
      'wasi:cli/terminal-output@0.2.0': {
        '[resource-drop]terminal-output': trampoline45,
      },
      'wasi:cli/terminal-stderr@0.2.0': {
        'get-terminal-stderr': exports4['184'],
      },
      'wasi:cli/terminal-stdin@0.2.0': {
        'get-terminal-stdin': exports4['182'],
      },
      'wasi:cli/terminal-stdout@0.2.0': {
        'get-terminal-stdout': exports4['183'],
      },
      'wasi:clocks/monotonic-clock@0.2.0': {
        now: trampoline34,
        resolution: trampoline33,
        'subscribe-duration': trampoline40,
        'subscribe-instant': trampoline41,
      },
      'wasi:clocks/wall-clock@0.2.0': {
        now: exports4['185'],
        resolution: exports4['186'],
      },
      'wasi:filesystem/preopens@0.2.0': {
        'get-directories': exports4['187'],
      },
      'wasi:filesystem/types@0.2.0': {
        '[method]descriptor.advise': exports4['113'],
        '[method]descriptor.append-via-stream': exports4['112'],
        '[method]descriptor.create-directory-at': exports4['123'],
        '[method]descriptor.get-flags': exports4['115'],
        '[method]descriptor.get-type': exports4['116'],
        '[method]descriptor.is-same-object': trampoline59,
        '[method]descriptor.link-at': exports4['127'],
        '[method]descriptor.metadata-hash': exports4['134'],
        '[method]descriptor.metadata-hash-at': exports4['135'],
        '[method]descriptor.open-at': exports4['128'],
        '[method]descriptor.read': exports4['119'],
        '[method]descriptor.read-directory': exports4['121'],
        '[method]descriptor.read-via-stream': exports4['110'],
        '[method]descriptor.readlink-at': exports4['129'],
        '[method]descriptor.remove-directory-at': exports4['130'],
        '[method]descriptor.rename-at': exports4['131'],
        '[method]descriptor.set-size': exports4['117'],
        '[method]descriptor.set-times': exports4['118'],
        '[method]descriptor.set-times-at': exports4['126'],
        '[method]descriptor.stat': exports4['124'],
        '[method]descriptor.stat-at': exports4['125'],
        '[method]descriptor.symlink-at': exports4['132'],
        '[method]descriptor.sync': exports4['122'],
        '[method]descriptor.sync-data': exports4['114'],
        '[method]descriptor.unlink-file-at': exports4['133'],
        '[method]descriptor.write': exports4['120'],
        '[method]descriptor.write-via-stream': exports4['111'],
        '[method]directory-entry-stream.read-directory-entry': exports4['136'],
        '[resource-drop]descriptor': trampoline39,
        '[resource-drop]directory-entry-stream': trampoline35,
        'filesystem-error-code': exports4['137'],
      },
      'wasi:io/error@0.2.0': {
        '[method]error.to-debug-string': exports4['95'],
        '[resource-drop]error': trampoline36,
      },
      'wasi:io/poll@0.2.0': {
        '[method]pollable.block': trampoline58,
        '[method]pollable.ready': trampoline57,
        '[resource-drop]pollable': trampoline44,
        poll: exports4['96'],
      },
      'wasi:io/streams@0.2.0': {
        '[method]input-stream.blocking-read': exports4['98'],
        '[method]input-stream.blocking-skip': exports4['100'],
        '[method]input-stream.read': exports4['97'],
        '[method]input-stream.skip': exports4['99'],
        '[method]input-stream.subscribe': trampoline43,
        '[method]output-stream.blocking-flush': exports4['105'],
        '[method]output-stream.blocking-splice': exports4['109'],
        '[method]output-stream.blocking-write-and-flush': exports4['103'],
        '[method]output-stream.blocking-write-zeroes-and-flush': exports4['107'],
        '[method]output-stream.check-write': exports4['101'],
        '[method]output-stream.flush': exports4['104'],
        '[method]output-stream.splice': exports4['108'],
        '[method]output-stream.subscribe': trampoline42,
        '[method]output-stream.write': exports4['102'],
        '[method]output-stream.write-zeroes': exports4['106'],
        '[resource-drop]input-stream': trampoline37,
        '[resource-drop]output-stream': trampoline38,
      },
      'wasi:random/insecure-seed@0.2.0': {
        'insecure-seed': exports4['192'],
      },
      'wasi:random/insecure@0.2.0': {
        'get-insecure-random-bytes': exports4['191'],
        'get-insecure-random-u64': trampoline70,
      },
      'wasi:random/random@0.2.0': {
        'get-random-bytes': exports4['190'],
        'get-random-u64': trampoline69,
      },
      'wasi:sockets/instance-network@0.2.0': {
        'instance-network': trampoline60,
      },
      'wasi:sockets/ip-name-lookup@0.2.0': {
        '[method]resolve-address-stream.resolve-next-address': exports4['178'],
        '[method]resolve-address-stream.subscribe': trampoline68,
        '[resource-drop]resolve-address-stream': trampoline56,
        'resolve-addresses': exports4['177'],
      },
      'wasi:sockets/network@0.2.0': {
        '[resource-drop]network': trampoline51,
      },
      'wasi:sockets/tcp-create-socket@0.2.0': {
        'create-tcp-socket': exports4['189'],
      },
      'wasi:sockets/tcp@0.2.0': {
        '[method]tcp-socket.accept': exports4['158'],
        '[method]tcp-socket.address-family': trampoline66,
        '[method]tcp-socket.finish-bind': exports4['153'],
        '[method]tcp-socket.finish-connect': exports4['155'],
        '[method]tcp-socket.finish-listen': exports4['157'],
        '[method]tcp-socket.hop-limit': exports4['170'],
        '[method]tcp-socket.is-listening': trampoline65,
        '[method]tcp-socket.keep-alive-count': exports4['168'],
        '[method]tcp-socket.keep-alive-enabled': exports4['162'],
        '[method]tcp-socket.keep-alive-idle-time': exports4['164'],
        '[method]tcp-socket.keep-alive-interval': exports4['166'],
        '[method]tcp-socket.local-address': exports4['159'],
        '[method]tcp-socket.receive-buffer-size': exports4['172'],
        '[method]tcp-socket.remote-address': exports4['160'],
        '[method]tcp-socket.send-buffer-size': exports4['174'],
        '[method]tcp-socket.set-hop-limit': exports4['171'],
        '[method]tcp-socket.set-keep-alive-count': exports4['169'],
        '[method]tcp-socket.set-keep-alive-enabled': exports4['163'],
        '[method]tcp-socket.set-keep-alive-idle-time': exports4['165'],
        '[method]tcp-socket.set-keep-alive-interval': exports4['167'],
        '[method]tcp-socket.set-listen-backlog-size': exports4['161'],
        '[method]tcp-socket.set-receive-buffer-size': exports4['173'],
        '[method]tcp-socket.set-send-buffer-size': exports4['175'],
        '[method]tcp-socket.shutdown': exports4['176'],
        '[method]tcp-socket.start-bind': exports4['152'],
        '[method]tcp-socket.start-connect': exports4['154'],
        '[method]tcp-socket.start-listen': exports4['156'],
        '[method]tcp-socket.subscribe': trampoline67,
        '[resource-drop]tcp-socket': trampoline55,
      },
      'wasi:sockets/udp-create-socket@0.2.0': {
        'create-udp-socket': exports4['188'],
      },
      'wasi:sockets/udp@0.2.0': {
        '[method]incoming-datagram-stream.receive': exports4['149'],
        '[method]incoming-datagram-stream.subscribe': trampoline63,
        '[method]outgoing-datagram-stream.check-send': exports4['150'],
        '[method]outgoing-datagram-stream.send': exports4['151'],
        '[method]outgoing-datagram-stream.subscribe': trampoline64,
        '[method]udp-socket.address-family': trampoline61,
        '[method]udp-socket.finish-bind': exports4['139'],
        '[method]udp-socket.local-address': exports4['141'],
        '[method]udp-socket.receive-buffer-size': exports4['145'],
        '[method]udp-socket.remote-address': exports4['142'],
        '[method]udp-socket.send-buffer-size': exports4['147'],
        '[method]udp-socket.set-receive-buffer-size': exports4['146'],
        '[method]udp-socket.set-send-buffer-size': exports4['148'],
        '[method]udp-socket.set-unicast-hop-limit': exports4['144'],
        '[method]udp-socket.start-bind': exports4['138'],
        '[method]udp-socket.stream': exports4['140'],
        '[method]udp-socket.subscribe': trampoline62,
        '[method]udp-socket.unicast-hop-limit': exports4['143'],
        '[resource-drop]incoming-datagram-stream': trampoline53,
        '[resource-drop]outgoing-datagram-stream': trampoline54,
        '[resource-drop]udp-socket': trampoline52,
      },
      wasi_snapshot_preview1: {
        adapter_close_badfd: exports5['wasi_snapshot_preview1:adapter_close_badfd'],
        adapter_open_badfd: exports5['wasi_snapshot_preview1:adapter_open_badfd'],
        args_get: exports5['wasi_snapshot_preview1:args_get'],
        args_sizes_get: exports5['wasi_snapshot_preview1:args_sizes_get'],
        clock_res_get: exports5['wasi_snapshot_preview1:clock_res_get'],
        clock_time_get: exports5['wasi_snapshot_preview1:clock_time_get'],
        environ_get: exports5['wasi_snapshot_preview1:environ_get'],
        environ_sizes_get: exports5['wasi_snapshot_preview1:environ_sizes_get'],
        fd_advise: exports5['wasi_snapshot_preview1:fd_advise'],
        fd_allocate: exports5['wasi_snapshot_preview1:fd_allocate'],
        fd_close: exports5['wasi_snapshot_preview1:fd_close'],
        fd_datasync: exports5['wasi_snapshot_preview1:fd_datasync'],
        fd_fdstat_get: exports5['wasi_snapshot_preview1:fd_fdstat_get'],
        fd_fdstat_set_flags: exports5['wasi_snapshot_preview1:fd_fdstat_set_flags'],
        fd_fdstat_set_rights: exports5['wasi_snapshot_preview1:fd_fdstat_set_rights'],
        fd_filestat_get: exports5['wasi_snapshot_preview1:fd_filestat_get'],
        fd_filestat_set_size: exports5['wasi_snapshot_preview1:fd_filestat_set_size'],
        fd_filestat_set_times: exports5['wasi_snapshot_preview1:fd_filestat_set_times'],
        fd_pread: exports5['wasi_snapshot_preview1:fd_pread'],
        fd_prestat_dir_name: exports5['wasi_snapshot_preview1:fd_prestat_dir_name'],
        fd_prestat_get: exports5['wasi_snapshot_preview1:fd_prestat_get'],
        fd_pwrite: exports5['wasi_snapshot_preview1:fd_pwrite'],
        fd_read: exports5['wasi_snapshot_preview1:fd_read'],
        fd_readdir: exports5['wasi_snapshot_preview1:fd_readdir'],
        fd_renumber: exports5['wasi_snapshot_preview1:fd_renumber'],
        fd_seek: exports5['wasi_snapshot_preview1:fd_seek'],
        fd_sync: exports5['wasi_snapshot_preview1:fd_sync'],
        fd_tell: exports5['wasi_snapshot_preview1:fd_tell'],
        fd_write: exports5['wasi_snapshot_preview1:fd_write'],
        path_create_directory: exports5['wasi_snapshot_preview1:path_create_directory'],
        path_filestat_get: exports5['wasi_snapshot_preview1:path_filestat_get'],
        path_filestat_set_times: exports5['wasi_snapshot_preview1:path_filestat_set_times'],
        path_link: exports5['wasi_snapshot_preview1:path_link'],
        path_open: exports5['wasi_snapshot_preview1:path_open'],
        path_readlink: exports5['wasi_snapshot_preview1:path_readlink'],
        path_remove_directory: exports5['wasi_snapshot_preview1:path_remove_directory'],
        path_rename: exports5['wasi_snapshot_preview1:path_rename'],
        path_symlink: exports5['wasi_snapshot_preview1:path_symlink'],
        path_unlink_file: exports5['wasi_snapshot_preview1:path_unlink_file'],
        poll_oneoff: exports5['wasi_snapshot_preview1:poll_oneoff'],
        proc_exit: exports5['wasi_snapshot_preview1:proc_exit'],
        random_get: exports5['wasi_snapshot_preview1:random_get'],
        sched_yield: exports5['wasi_snapshot_preview1:sched_yield'],
        sock_accept: exports5['wasi_snapshot_preview1:sock_accept'],
        sock_recv: exports5['wasi_snapshot_preview1:sock_recv'],
        sock_send: exports5['wasi_snapshot_preview1:sock_send'],
        sock_shutdown: exports5['wasi_snapshot_preview1:sock_shutdown'],
      },
    }));
    ({ exports: exports12 } = yield instantiateCore(yield module11, {
      env: {
        __indirect_function_table: exports5.__indirect_function_table,
        __stack_pointer: exports5.__stack_pointer,
        __table_base: exports5['libcomponentize_py_bindings.so:table_base'],
        cabi_realloc: exports8.cabi_realloc,
        'componentize-py#Allocate': exports8['componentize-py#Allocate'],
        'componentize-py#Dispatch': exports8['componentize-py#Dispatch'],
        'componentize-py#Free': exports8['componentize-py#Free'],
        'componentize-py#FromCanonBool': exports8['componentize-py#FromCanonBool'],
        'componentize-py#FromCanonChar': exports8['componentize-py#FromCanonChar'],
        'componentize-py#FromCanonF32': exports8['componentize-py#FromCanonF32'],
        'componentize-py#FromCanonF64': exports8['componentize-py#FromCanonF64'],
        'componentize-py#FromCanonHandle': exports8['componentize-py#FromCanonHandle'],
        'componentize-py#FromCanonI32': exports8['componentize-py#FromCanonI32'],
        'componentize-py#FromCanonI64': exports8['componentize-py#FromCanonI64'],
        'componentize-py#FromCanonString': exports8['componentize-py#FromCanonString'],
        'componentize-py#FromCanonU32': exports8['componentize-py#FromCanonU32'],
        'componentize-py#FromCanonU64': exports8['componentize-py#FromCanonU64'],
        'componentize-py#GetBytes': exports8['componentize-py#GetBytes'],
        'componentize-py#GetField': exports8['componentize-py#GetField'],
        'componentize-py#GetListElement': exports8['componentize-py#GetListElement'],
        'componentize-py#GetListLength': exports8['componentize-py#GetListLength'],
        'componentize-py#Init': exports8['componentize-py#Init'],
        'componentize-py#ListAppend': exports8['componentize-py#ListAppend'],
        'componentize-py#MakeBytes': exports8['componentize-py#MakeBytes'],
        'componentize-py#MakeList': exports8['componentize-py#MakeList'],
        'componentize-py#None': exports8['componentize-py#None'],
        'componentize-py#ToCanonBool': exports8['componentize-py#ToCanonBool'],
        'componentize-py#ToCanonChar': exports8['componentize-py#ToCanonChar'],
        'componentize-py#ToCanonF32': exports8['componentize-py#ToCanonF32'],
        'componentize-py#ToCanonF64': exports8['componentize-py#ToCanonF64'],
        'componentize-py#ToCanonHandle': exports8['componentize-py#ToCanonHandle'],
        'componentize-py#ToCanonI32': exports8['componentize-py#ToCanonI32'],
        'componentize-py#ToCanonI64': exports8['componentize-py#ToCanonI64'],
        'componentize-py#ToCanonString': exports8['componentize-py#ToCanonString'],
        'componentize-py#ToCanonU32': exports8['componentize-py#ToCanonU32'],
        'componentize-py#ToCanonU64': exports8['componentize-py#ToCanonU64'],
        memory: exports5.memory,
      },
    }));
    ({ exports: exports13 } = yield instantiateCore(yield module12, {
      env: {
        __indirect_function_table: exports5.__indirect_function_table,
        __memory_base: exports5['libwasi-emulated-getpid.so:memory_base'],
        __table_base: exports5['libwasi-emulated-getpid.so:table_base'],
        memory: exports5.memory,
      },
    }));
    ({ exports: exports14 } = yield instantiateCore(yield module13, {
      'GOT.mem': {
        errno: exports5['libwasi-emulated-process-clocks.so:errno'],
      },
      env: {
        __indirect_function_table: exports5.__indirect_function_table,
        __memory_base: exports5['libwasi-emulated-process-clocks.so:memory_base'],
        __stack_pointer: exports5.__stack_pointer,
        __table_base: exports5['libwasi-emulated-process-clocks.so:table_base'],
        __wasi_clock_time_get: exports11.__wasi_clock_time_get,
        clock: exports5.clock,
        memory: exports5.memory,
      },
    }));
    ({ exports: exports15 } = yield instantiateCore(yield module14, {
      env: {
        __indirect_function_table: exports5.__indirect_function_table,
        __memory_base: exports5['libdl.so:memory_base'],
        __table_base: exports5['libdl.so:table_base'],
        memcmp: exports11.memcmp,
        memory: exports5.memory,
        strlen: exports11.strlen,
      },
    }));
    memory1 = exports5.memory;
    realloc1 = exports6.cabi_import_realloc;
    realloc2 = exports8.cabi_realloc;
    realloc3 = exports11.cabi_realloc;
    ({ exports: exports16 } = yield instantiateCore(yield module17, {
      '': {
        $imports: exports4.$imports,
        '0': exports6.args_get,
        '1': exports6.args_sizes_get,
        '10': exports6.fd_fdstat_get,
        '100': trampoline122,
        '101': trampoline104,
        '102': trampoline105,
        '103': trampoline106,
        '104': trampoline123,
        '105': trampoline107,
        '106': trampoline124,
        '107': trampoline125,
        '108': trampoline126,
        '109': trampoline127,
        '11': exports6.fd_fdstat_set_flags,
        '110': trampoline87,
        '111': trampoline88,
        '112': trampoline89,
        '113': trampoline74,
        '114': trampoline75,
        '115': trampoline90,
        '116': trampoline76,
        '117': trampoline77,
        '118': trampoline91,
        '119': trampoline128,
        '12': exports6.fd_fdstat_set_rights,
        '120': trampoline78,
        '121': trampoline80,
        '122': trampoline81,
        '123': trampoline82,
        '124': trampoline93,
        '125': trampoline94,
        '126': trampoline95,
        '127': trampoline96,
        '128': trampoline97,
        '129': trampoline129,
        '13': exports6.fd_filestat_get,
        '130': trampoline83,
        '131': trampoline84,
        '132': trampoline85,
        '133': trampoline86,
        '134': trampoline99,
        '135': trampoline100,
        '136': trampoline130,
        '137': trampoline79,
        '138': trampoline131,
        '139': trampoline132,
        '14': exports6.fd_filestat_set_size,
        '140': trampoline133,
        '141': trampoline134,
        '142': trampoline135,
        '143': trampoline136,
        '144': trampoline137,
        '145': trampoline138,
        '146': trampoline139,
        '147': trampoline140,
        '148': trampoline141,
        '149': trampoline142,
        '15': exports6.fd_filestat_set_times,
        '150': trampoline143,
        '151': trampoline144,
        '152': trampoline145,
        '153': trampoline146,
        '154': trampoline147,
        '155': trampoline148,
        '156': trampoline149,
        '157': trampoline150,
        '158': trampoline151,
        '159': trampoline152,
        '16': exports6.fd_pread,
        '160': trampoline153,
        '161': trampoline154,
        '162': trampoline155,
        '163': trampoline156,
        '164': trampoline157,
        '165': trampoline158,
        '166': trampoline159,
        '167': trampoline160,
        '168': trampoline161,
        '169': trampoline162,
        '17': exports6.fd_prestat_dir_name,
        '170': trampoline163,
        '171': trampoline164,
        '172': trampoline165,
        '173': trampoline166,
        '174': trampoline167,
        '175': trampoline168,
        '176': trampoline169,
        '177': trampoline170,
        '178': trampoline171,
        '179': trampoline172,
        '18': exports6.fd_prestat_get,
        '180': trampoline173,
        '181': trampoline174,
        '182': trampoline112,
        '183': trampoline113,
        '184': trampoline114,
        '185': trampoline73,
        '186': trampoline72,
        '187': trampoline175,
        '188': trampoline176,
        '189': trampoline177,
        '19': exports6.fd_pwrite,
        '190': trampoline178,
        '191': trampoline179,
        '192': trampoline180,
        '2': exports6.clock_res_get,
        '20': exports6.fd_read,
        '21': exports6.fd_readdir,
        '22': exports6.fd_renumber,
        '23': exports6.fd_seek,
        '24': exports6.fd_sync,
        '25': exports6.fd_tell,
        '26': exports6.fd_write,
        '27': exports6.path_create_directory,
        '28': exports6.path_filestat_get,
        '29': exports6.path_filestat_set_times,
        '3': exports6.clock_time_get,
        '30': exports6.path_link,
        '31': exports6.path_open,
        '32': exports6.path_readlink,
        '33': exports6.path_remove_directory,
        '34': exports6.path_rename,
        '35': exports6.path_symlink,
        '36': exports6.path_unlink_file,
        '37': exports6.poll_oneoff,
        '38': exports6.proc_exit,
        '39': exports6.proc_raise,
        '4': exports6.environ_get,
        '40': exports6.random_get,
        '41': exports6.reset_adapter_state,
        '42': exports6.sched_yield,
        '43': exports6.sock_accept,
        '44': exports6.sock_recv,
        '45': exports6.sock_send,
        '46': exports6.sock_shutdown,
        '47': exports6.adapter_close_badfd,
        '48': exports6.adapter_open_badfd,
        '49': trampoline71,
        '5': exports6.environ_sizes_get,
        '50': trampoline72,
        '51': trampoline73,
        '52': trampoline74,
        '53': trampoline75,
        '54': trampoline76,
        '55': trampoline77,
        '56': trampoline78,
        '57': trampoline79,
        '58': trampoline80,
        '59': trampoline81,
        '6': exports6.fd_advise,
        '60': trampoline82,
        '61': trampoline83,
        '62': trampoline84,
        '63': trampoline85,
        '64': trampoline86,
        '65': trampoline87,
        '66': trampoline88,
        '67': trampoline89,
        '68': trampoline90,
        '69': trampoline91,
        '7': exports6.fd_allocate,
        '70': trampoline92,
        '71': trampoline93,
        '72': trampoline94,
        '73': trampoline95,
        '74': trampoline96,
        '75': trampoline97,
        '76': trampoline98,
        '77': trampoline99,
        '78': trampoline100,
        '79': trampoline101,
        '8': exports6.fd_close,
        '80': trampoline102,
        '81': trampoline103,
        '82': trampoline104,
        '83': trampoline105,
        '84': trampoline106,
        '85': trampoline107,
        '86': trampoline108,
        '87': trampoline109,
        '88': trampoline110,
        '89': trampoline111,
        '9': exports6.fd_datasync,
        '90': trampoline112,
        '91': trampoline113,
        '92': trampoline114,
        '93': trampoline115,
        '94': trampoline116,
        '95': trampoline117,
        '96': trampoline118,
        '97': trampoline119,
        '98': trampoline120,
        '99': trampoline121,
      },
    }));
    ({ exports: exports17 } = yield instantiateCore(yield module15, {
      env: {
        __indirect_function_table: exports5.__indirect_function_table,
        'libc.so:_CLOCK_REALTIME': exports5['libc.so:_CLOCK_REALTIME'],
        'libc.so:__optpos': exports5['libc.so:__optpos'],
        'libc.so:__optreset': exports5['libc.so:__optreset'],
        'libc.so:__signgam': exports5['libc.so:__signgam'],
        'libc.so:__stack_chk_guard': exports5['libc.so:__stack_chk_guard'],
        'libc.so:__wasi_sockets_services_db': exports5['libc.so:__wasi_sockets_services_db'],
        'libc.so:__wasilibc_cwd': exports5['libc.so:__wasilibc_cwd'],
        'libc.so:__wasilibc_environ': exports5['libc.so:__wasilibc_environ'],
        'libc.so:__wasilibc_pthread_self': exports5['libc.so:__wasilibc_pthread_self'],
        'libc.so:errno': exports5['libc.so:errno'],
        'libc.so:getdate_err': exports5['libc.so:getdate_err'],
        'libc.so:memory_base': exports5['libc.so:memory_base'],
        'libc.so:optarg': exports5['libc.so:optarg'],
        'libc.so:opterr': exports5['libc.so:opterr'],
        'libc.so:optind': exports5['libc.so:optind'],
        'libc.so:optopt': exports5['libc.so:optopt'],
        'libcomponentize_py_runtime.so:PyBaseObject_Type': exports5['libcomponentize_py_runtime.so:PyBaseObject_Type'],
        'libcomponentize_py_runtime.so:PyBool_Type': exports5['libcomponentize_py_runtime.so:PyBool_Type'],
        'libcomponentize_py_runtime.so:PyByteArray_Type': exports5['libcomponentize_py_runtime.so:PyByteArray_Type'],
        'libcomponentize_py_runtime.so:PyExc_AttributeError': exports5['libcomponentize_py_runtime.so:PyExc_AttributeError'],
        'libcomponentize_py_runtime.so:PyExc_BaseException': exports5['libcomponentize_py_runtime.so:PyExc_BaseException'],
        'libcomponentize_py_runtime.so:PyExc_BlockingIOError': exports5['libcomponentize_py_runtime.so:PyExc_BlockingIOError'],
        'libcomponentize_py_runtime.so:PyExc_BrokenPipeError': exports5['libcomponentize_py_runtime.so:PyExc_BrokenPipeError'],
        'libcomponentize_py_runtime.so:PyExc_ConnectionAbortedError': exports5['libcomponentize_py_runtime.so:PyExc_ConnectionAbortedError'],
        'libcomponentize_py_runtime.so:PyExc_ConnectionRefusedError': exports5['libcomponentize_py_runtime.so:PyExc_ConnectionRefusedError'],
        'libcomponentize_py_runtime.so:PyExc_ConnectionResetError': exports5['libcomponentize_py_runtime.so:PyExc_ConnectionResetError'],
        'libcomponentize_py_runtime.so:PyExc_FileExistsError': exports5['libcomponentize_py_runtime.so:PyExc_FileExistsError'],
        'libcomponentize_py_runtime.so:PyExc_FileNotFoundError': exports5['libcomponentize_py_runtime.so:PyExc_FileNotFoundError'],
        'libcomponentize_py_runtime.so:PyExc_ImportError': exports5['libcomponentize_py_runtime.so:PyExc_ImportError'],
        'libcomponentize_py_runtime.so:PyExc_InterruptedError': exports5['libcomponentize_py_runtime.so:PyExc_InterruptedError'],
        'libcomponentize_py_runtime.so:PyExc_IsADirectoryError': exports5['libcomponentize_py_runtime.so:PyExc_IsADirectoryError'],
        'libcomponentize_py_runtime.so:PyExc_MemoryError': exports5['libcomponentize_py_runtime.so:PyExc_MemoryError'],
        'libcomponentize_py_runtime.so:PyExc_NotADirectoryError': exports5['libcomponentize_py_runtime.so:PyExc_NotADirectoryError'],
        'libcomponentize_py_runtime.so:PyExc_OSError': exports5['libcomponentize_py_runtime.so:PyExc_OSError'],
        'libcomponentize_py_runtime.so:PyExc_OverflowError': exports5['libcomponentize_py_runtime.so:PyExc_OverflowError'],
        'libcomponentize_py_runtime.so:PyExc_PermissionError': exports5['libcomponentize_py_runtime.so:PyExc_PermissionError'],
        'libcomponentize_py_runtime.so:PyExc_RuntimeError': exports5['libcomponentize_py_runtime.so:PyExc_RuntimeError'],
        'libcomponentize_py_runtime.so:PyExc_SystemError': exports5['libcomponentize_py_runtime.so:PyExc_SystemError'],
        'libcomponentize_py_runtime.so:PyExc_TimeoutError': exports5['libcomponentize_py_runtime.so:PyExc_TimeoutError'],
        'libcomponentize_py_runtime.so:PyExc_TypeError': exports5['libcomponentize_py_runtime.so:PyExc_TypeError'],
        'libcomponentize_py_runtime.so:PyExc_UnicodeDecodeError': exports5['libcomponentize_py_runtime.so:PyExc_UnicodeDecodeError'],
        'libcomponentize_py_runtime.so:PyExc_ValueError': exports5['libcomponentize_py_runtime.so:PyExc_ValueError'],
        'libcomponentize_py_runtime.so:PyLong_Type': exports5['libcomponentize_py_runtime.so:PyLong_Type'],
        'libcomponentize_py_runtime.so:PyModule_Type': exports5['libcomponentize_py_runtime.so:PyModule_Type'],
        'libcomponentize_py_runtime.so:PyRange_Type': exports5['libcomponentize_py_runtime.so:PyRange_Type'],
        'libcomponentize_py_runtime.so:PySuper_Type': exports5['libcomponentize_py_runtime.so:PySuper_Type'],
        'libcomponentize_py_runtime.so:_CLOCK_MONOTONIC': exports5['libcomponentize_py_runtime.so:_CLOCK_MONOTONIC'],
        'libcomponentize_py_runtime.so:_CLOCK_PROCESS_CPUTIME_ID': exports5['libcomponentize_py_runtime.so:_CLOCK_PROCESS_CPUTIME_ID'],
        'libcomponentize_py_runtime.so:_CLOCK_REALTIME': exports5['libcomponentize_py_runtime.so:_CLOCK_REALTIME'],
        'libcomponentize_py_runtime.so:_CLOCK_THREAD_CPUTIME_ID': exports5['libcomponentize_py_runtime.so:_CLOCK_THREAD_CPUTIME_ID'],
        'libcomponentize_py_runtime.so:_PyWeakref_CallableProxyType': exports5['libcomponentize_py_runtime.so:_PyWeakref_CallableProxyType'],
        'libcomponentize_py_runtime.so:_PyWeakref_ProxyType': exports5['libcomponentize_py_runtime.so:_PyWeakref_ProxyType'],
        'libcomponentize_py_runtime.so:_PyWeakref_RefType': exports5['libcomponentize_py_runtime.so:_PyWeakref_RefType'],
        'libcomponentize_py_runtime.so:_Py_FalseStruct': exports5['libcomponentize_py_runtime.so:_Py_FalseStruct'],
        'libcomponentize_py_runtime.so:_Py_NoneStruct': exports5['libcomponentize_py_runtime.so:_Py_NoneStruct'],
        'libcomponentize_py_runtime.so:_Py_TrueStruct': exports5['libcomponentize_py_runtime.so:_Py_TrueStruct'],
        'libcomponentize_py_runtime.so:_ZN3std2io5stdio6stderr8INSTANCE17h8ff5d5e318e80a25E': exports5['libcomponentize_py_runtime.so:_ZN3std2io5stdio6stderr8INSTANCE17h8ff5d5e318e80a25E'],
        'libcomponentize_py_runtime.so:_ZN3std4hash6random11RandomState3new4KEYS28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17h746d1020d9bcb391E': exports5['libcomponentize_py_runtime.so:_ZN3std4hash6random11RandomState3new4KEYS28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17h746d1020d9bcb391E'],
        'libcomponentize_py_runtime.so:_ZN3std4sync4mpmc5waker17current_thread_id5DUMMY28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17hc9a0250b98262fd5E': exports5['libcomponentize_py_runtime.so:_ZN3std4sync4mpmc5waker17current_thread_id5DUMMY28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17hc9a0250b98262fd5E'],
        'libcomponentize_py_runtime.so:_ZN3std5alloc4HOOK17h20769bdf4aef60c1E': exports5['libcomponentize_py_runtime.so:_ZN3std5alloc4HOOK17h20769bdf4aef60c1E'],
        'libcomponentize_py_runtime.so:_ZN3std6thread7current2id2ID17hf767b40513ccbad0E': exports5['libcomponentize_py_runtime.so:_ZN3std6thread7current2id2ID17hf767b40513ccbad0E'],
        'libcomponentize_py_runtime.so:_ZN3std6thread7current7CURRENT17h5d5fadd57b31de29E': exports5['libcomponentize_py_runtime.so:_ZN3std6thread7current7CURRENT17h5d5fadd57b31de29E'],
        'libcomponentize_py_runtime.so:_ZN3std6thread9spawnhook11SPAWN_HOOKS28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17ha8c951123c883964E': exports5['libcomponentize_py_runtime.so:_ZN3std6thread9spawnhook11SPAWN_HOOKS28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17ha8c951123c883964E'],
        'libcomponentize_py_runtime.so:_ZN3std9panicking11panic_count18GLOBAL_PANIC_COUNT17h0e9afc33c554212dE': exports5['libcomponentize_py_runtime.so:_ZN3std9panicking11panic_count18GLOBAL_PANIC_COUNT17h0e9afc33c554212dE'],
        'libcomponentize_py_runtime.so:_ZN3std9panicking4HOOK17he27851ff2a95e3bcE': exports5['libcomponentize_py_runtime.so:_ZN3std9panicking4HOOK17he27851ff2a95e3bcE'],
        'libcomponentize_py_runtime.so:_ZN4core3num7flt2dec8strategy5grisu12CACHED_POW1017h245f4845a56781b7E': exports5['libcomponentize_py_runtime.so:_ZN4core3num7flt2dec8strategy5grisu12CACHED_POW1017h245f4845a56781b7E'],
        'libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data11white_space14WHITESPACE_MAP17hdb30b7a7fa132b9eE': exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data11white_space14WHITESPACE_MAP17hdb30b7a7fa132b9eE'],
        'libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9lowercase14BITSET_MAPPING17h7b5959b5b3a91b3cE': exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9lowercase14BITSET_MAPPING17h7b5959b5b3a91b3cE'],
        'libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9lowercase16BITSET_CANONICAL17hf093b885c4cc2c6cE': exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9lowercase16BITSET_CANONICAL17hf093b885c4cc2c6cE'],
        'libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9lowercase17BITSET_CHUNKS_MAP17hc4a0f1107853b0bbE': exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9lowercase17BITSET_CHUNKS_MAP17hc4a0f1107853b0bbE'],
        'libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9lowercase19BITSET_INDEX_CHUNKS17ha2af8d4cb9f50aa2E': exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9lowercase19BITSET_INDEX_CHUNKS17ha2af8d4cb9f50aa2E'],
        'libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9uppercase14BITSET_MAPPING17h7b240eae70249a98E': exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9uppercase14BITSET_MAPPING17h7b240eae70249a98E'],
        'libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9uppercase16BITSET_CANONICAL17hb64b329ca8154c50E': exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9uppercase16BITSET_CANONICAL17hb64b329ca8154c50E'],
        'libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9uppercase17BITSET_CHUNKS_MAP17hb72af7ce6470de5cE': exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9uppercase17BITSET_CHUNKS_MAP17hb72af7ce6470de5cE'],
        'libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9uppercase19BITSET_INDEX_CHUNKS17h3f86610b88827841E': exports5['libcomponentize_py_runtime.so:_ZN4core7unicode12unicode_data9uppercase19BITSET_INDEX_CHUNKS17h3f86610b88827841E'],
        'libcomponentize_py_runtime.so:errno': exports5['libcomponentize_py_runtime.so:errno'],
        'libcomponentize_py_runtime.so:memory_base': exports5['libcomponentize_py_runtime.so:memory_base'],
        'libpython3.14.so:PY_TIMEOUT_MAX': exports5['libpython3.14.so:PY_TIMEOUT_MAX'],
        'libpython3.14.so:PyAsyncGen_Type': exports5['libpython3.14.so:PyAsyncGen_Type'],
        'libpython3.14.so:PyBaseObject_Type': exports5['libpython3.14.so:PyBaseObject_Type'],
        'libpython3.14.so:PyBool_Type': exports5['libpython3.14.so:PyBool_Type'],
        'libpython3.14.so:PyByteArrayIter_Type': exports5['libpython3.14.so:PyByteArrayIter_Type'],
        'libpython3.14.so:PyByteArray_Type': exports5['libpython3.14.so:PyByteArray_Type'],
        'libpython3.14.so:PyBytesIter_Type': exports5['libpython3.14.so:PyBytesIter_Type'],
        'libpython3.14.so:PyBytes_Type': exports5['libpython3.14.so:PyBytes_Type'],
        'libpython3.14.so:PyCFunction_Type': exports5['libpython3.14.so:PyCFunction_Type'],
        'libpython3.14.so:PyCMethod_Type': exports5['libpython3.14.so:PyCMethod_Type'],
        'libpython3.14.so:PyCallIter_Type': exports5['libpython3.14.so:PyCallIter_Type'],
        'libpython3.14.so:PyCapsule_Type': exports5['libpython3.14.so:PyCapsule_Type'],
        'libpython3.14.so:PyCell_Type': exports5['libpython3.14.so:PyCell_Type'],
        'libpython3.14.so:PyClassMethodDescr_Type': exports5['libpython3.14.so:PyClassMethodDescr_Type'],
        'libpython3.14.so:PyClassMethod_Type': exports5['libpython3.14.so:PyClassMethod_Type'],
        'libpython3.14.so:PyCode_Type': exports5['libpython3.14.so:PyCode_Type'],
        'libpython3.14.so:PyComplex_Type': exports5['libpython3.14.so:PyComplex_Type'],
        'libpython3.14.so:PyContextToken_Type': exports5['libpython3.14.so:PyContextToken_Type'],
        'libpython3.14.so:PyContextVar_Type': exports5['libpython3.14.so:PyContextVar_Type'],
        'libpython3.14.so:PyContext_Type': exports5['libpython3.14.so:PyContext_Type'],
        'libpython3.14.so:PyCoro_Type': exports5['libpython3.14.so:PyCoro_Type'],
        'libpython3.14.so:PyDictItems_Type': exports5['libpython3.14.so:PyDictItems_Type'],
        'libpython3.14.so:PyDictIterItem_Type': exports5['libpython3.14.so:PyDictIterItem_Type'],
        'libpython3.14.so:PyDictIterKey_Type': exports5['libpython3.14.so:PyDictIterKey_Type'],
        'libpython3.14.so:PyDictIterValue_Type': exports5['libpython3.14.so:PyDictIterValue_Type'],
        'libpython3.14.so:PyDictKeys_Type': exports5['libpython3.14.so:PyDictKeys_Type'],
        'libpython3.14.so:PyDictProxy_Type': exports5['libpython3.14.so:PyDictProxy_Type'],
        'libpython3.14.so:PyDictRevIterItem_Type': exports5['libpython3.14.so:PyDictRevIterItem_Type'],
        'libpython3.14.so:PyDictRevIterKey_Type': exports5['libpython3.14.so:PyDictRevIterKey_Type'],
        'libpython3.14.so:PyDictRevIterValue_Type': exports5['libpython3.14.so:PyDictRevIterValue_Type'],
        'libpython3.14.so:PyDictValues_Type': exports5['libpython3.14.so:PyDictValues_Type'],
        'libpython3.14.so:PyDict_Type': exports5['libpython3.14.so:PyDict_Type'],
        'libpython3.14.so:PyEllipsis_Type': exports5['libpython3.14.so:PyEllipsis_Type'],
        'libpython3.14.so:PyEnum_Type': exports5['libpython3.14.so:PyEnum_Type'],
        'libpython3.14.so:PyExc_ArithmeticError': exports5['libpython3.14.so:PyExc_ArithmeticError'],
        'libpython3.14.so:PyExc_AssertionError': exports5['libpython3.14.so:PyExc_AssertionError'],
        'libpython3.14.so:PyExc_AttributeError': exports5['libpython3.14.so:PyExc_AttributeError'],
        'libpython3.14.so:PyExc_BaseException': exports5['libpython3.14.so:PyExc_BaseException'],
        'libpython3.14.so:PyExc_BaseExceptionGroup': exports5['libpython3.14.so:PyExc_BaseExceptionGroup'],
        'libpython3.14.so:PyExc_BlockingIOError': exports5['libpython3.14.so:PyExc_BlockingIOError'],
        'libpython3.14.so:PyExc_BrokenPipeError': exports5['libpython3.14.so:PyExc_BrokenPipeError'],
        'libpython3.14.so:PyExc_BufferError': exports5['libpython3.14.so:PyExc_BufferError'],
        'libpython3.14.so:PyExc_BytesWarning': exports5['libpython3.14.so:PyExc_BytesWarning'],
        'libpython3.14.so:PyExc_ChildProcessError': exports5['libpython3.14.so:PyExc_ChildProcessError'],
        'libpython3.14.so:PyExc_ConnectionAbortedError': exports5['libpython3.14.so:PyExc_ConnectionAbortedError'],
        'libpython3.14.so:PyExc_ConnectionRefusedError': exports5['libpython3.14.so:PyExc_ConnectionRefusedError'],
        'libpython3.14.so:PyExc_ConnectionResetError': exports5['libpython3.14.so:PyExc_ConnectionResetError'],
        'libpython3.14.so:PyExc_DeprecationWarning': exports5['libpython3.14.so:PyExc_DeprecationWarning'],
        'libpython3.14.so:PyExc_EOFError': exports5['libpython3.14.so:PyExc_EOFError'],
        'libpython3.14.so:PyExc_EncodingWarning': exports5['libpython3.14.so:PyExc_EncodingWarning'],
        'libpython3.14.so:PyExc_EnvironmentError': exports5['libpython3.14.so:PyExc_EnvironmentError'],
        'libpython3.14.so:PyExc_Exception': exports5['libpython3.14.so:PyExc_Exception'],
        'libpython3.14.so:PyExc_FileExistsError': exports5['libpython3.14.so:PyExc_FileExistsError'],
        'libpython3.14.so:PyExc_FileNotFoundError': exports5['libpython3.14.so:PyExc_FileNotFoundError'],
        'libpython3.14.so:PyExc_GeneratorExit': exports5['libpython3.14.so:PyExc_GeneratorExit'],
        'libpython3.14.so:PyExc_IOError': exports5['libpython3.14.so:PyExc_IOError'],
        'libpython3.14.so:PyExc_ImportError': exports5['libpython3.14.so:PyExc_ImportError'],
        'libpython3.14.so:PyExc_ImportWarning': exports5['libpython3.14.so:PyExc_ImportWarning'],
        'libpython3.14.so:PyExc_IndentationError': exports5['libpython3.14.so:PyExc_IndentationError'],
        'libpython3.14.so:PyExc_IndexError': exports5['libpython3.14.so:PyExc_IndexError'],
        'libpython3.14.so:PyExc_InterpreterError': exports5['libpython3.14.so:PyExc_InterpreterError'],
        'libpython3.14.so:PyExc_InterpreterNotFoundError': exports5['libpython3.14.so:PyExc_InterpreterNotFoundError'],
        'libpython3.14.so:PyExc_InterruptedError': exports5['libpython3.14.so:PyExc_InterruptedError'],
        'libpython3.14.so:PyExc_IsADirectoryError': exports5['libpython3.14.so:PyExc_IsADirectoryError'],
        'libpython3.14.so:PyExc_KeyError': exports5['libpython3.14.so:PyExc_KeyError'],
        'libpython3.14.so:PyExc_KeyboardInterrupt': exports5['libpython3.14.so:PyExc_KeyboardInterrupt'],
        'libpython3.14.so:PyExc_LookupError': exports5['libpython3.14.so:PyExc_LookupError'],
        'libpython3.14.so:PyExc_MemoryError': exports5['libpython3.14.so:PyExc_MemoryError'],
        'libpython3.14.so:PyExc_ModuleNotFoundError': exports5['libpython3.14.so:PyExc_ModuleNotFoundError'],
        'libpython3.14.so:PyExc_NameError': exports5['libpython3.14.so:PyExc_NameError'],
        'libpython3.14.so:PyExc_NotADirectoryError': exports5['libpython3.14.so:PyExc_NotADirectoryError'],
        'libpython3.14.so:PyExc_NotImplementedError': exports5['libpython3.14.so:PyExc_NotImplementedError'],
        'libpython3.14.so:PyExc_OSError': exports5['libpython3.14.so:PyExc_OSError'],
        'libpython3.14.so:PyExc_OverflowError': exports5['libpython3.14.so:PyExc_OverflowError'],
        'libpython3.14.so:PyExc_PendingDeprecationWarning': exports5['libpython3.14.so:PyExc_PendingDeprecationWarning'],
        'libpython3.14.so:PyExc_PermissionError': exports5['libpython3.14.so:PyExc_PermissionError'],
        'libpython3.14.so:PyExc_ProcessLookupError': exports5['libpython3.14.so:PyExc_ProcessLookupError'],
        'libpython3.14.so:PyExc_PythonFinalizationError': exports5['libpython3.14.so:PyExc_PythonFinalizationError'],
        'libpython3.14.so:PyExc_RecursionError': exports5['libpython3.14.so:PyExc_RecursionError'],
        'libpython3.14.so:PyExc_ReferenceError': exports5['libpython3.14.so:PyExc_ReferenceError'],
        'libpython3.14.so:PyExc_ResourceWarning': exports5['libpython3.14.so:PyExc_ResourceWarning'],
        'libpython3.14.so:PyExc_RuntimeError': exports5['libpython3.14.so:PyExc_RuntimeError'],
        'libpython3.14.so:PyExc_RuntimeWarning': exports5['libpython3.14.so:PyExc_RuntimeWarning'],
        'libpython3.14.so:PyExc_StopAsyncIteration': exports5['libpython3.14.so:PyExc_StopAsyncIteration'],
        'libpython3.14.so:PyExc_StopIteration': exports5['libpython3.14.so:PyExc_StopIteration'],
        'libpython3.14.so:PyExc_SyntaxError': exports5['libpython3.14.so:PyExc_SyntaxError'],
        'libpython3.14.so:PyExc_SyntaxWarning': exports5['libpython3.14.so:PyExc_SyntaxWarning'],
        'libpython3.14.so:PyExc_SystemError': exports5['libpython3.14.so:PyExc_SystemError'],
        'libpython3.14.so:PyExc_SystemExit': exports5['libpython3.14.so:PyExc_SystemExit'],
        'libpython3.14.so:PyExc_TabError': exports5['libpython3.14.so:PyExc_TabError'],
        'libpython3.14.so:PyExc_TimeoutError': exports5['libpython3.14.so:PyExc_TimeoutError'],
        'libpython3.14.so:PyExc_TypeError': exports5['libpython3.14.so:PyExc_TypeError'],
        'libpython3.14.so:PyExc_UnboundLocalError': exports5['libpython3.14.so:PyExc_UnboundLocalError'],
        'libpython3.14.so:PyExc_UnicodeDecodeError': exports5['libpython3.14.so:PyExc_UnicodeDecodeError'],
        'libpython3.14.so:PyExc_UnicodeEncodeError': exports5['libpython3.14.so:PyExc_UnicodeEncodeError'],
        'libpython3.14.so:PyExc_UnicodeError': exports5['libpython3.14.so:PyExc_UnicodeError'],
        'libpython3.14.so:PyExc_UnicodeTranslateError': exports5['libpython3.14.so:PyExc_UnicodeTranslateError'],
        'libpython3.14.so:PyExc_UserWarning': exports5['libpython3.14.so:PyExc_UserWarning'],
        'libpython3.14.so:PyExc_ValueError': exports5['libpython3.14.so:PyExc_ValueError'],
        'libpython3.14.so:PyExc_Warning': exports5['libpython3.14.so:PyExc_Warning'],
        'libpython3.14.so:PyExc_ZeroDivisionError': exports5['libpython3.14.so:PyExc_ZeroDivisionError'],
        'libpython3.14.so:PyFilter_Type': exports5['libpython3.14.so:PyFilter_Type'],
        'libpython3.14.so:PyFloat_Type': exports5['libpython3.14.so:PyFloat_Type'],
        'libpython3.14.so:PyFrameLocalsProxy_Type': exports5['libpython3.14.so:PyFrameLocalsProxy_Type'],
        'libpython3.14.so:PyFrame_Type': exports5['libpython3.14.so:PyFrame_Type'],
        'libpython3.14.so:PyFrozenSet_Type': exports5['libpython3.14.so:PyFrozenSet_Type'],
        'libpython3.14.so:PyFunction_Type': exports5['libpython3.14.so:PyFunction_Type'],
        'libpython3.14.so:PyGen_Type': exports5['libpython3.14.so:PyGen_Type'],
        'libpython3.14.so:PyGetSetDescr_Type': exports5['libpython3.14.so:PyGetSetDescr_Type'],
        'libpython3.14.so:PyImport_FrozenModules': exports5['libpython3.14.so:PyImport_FrozenModules'],
        'libpython3.14.so:PyImport_Inittab': exports5['libpython3.14.so:PyImport_Inittab'],
        'libpython3.14.so:PyInstanceMethod_Type': exports5['libpython3.14.so:PyInstanceMethod_Type'],
        'libpython3.14.so:PyListIter_Type': exports5['libpython3.14.so:PyListIter_Type'],
        'libpython3.14.so:PyListRevIter_Type': exports5['libpython3.14.so:PyListRevIter_Type'],
        'libpython3.14.so:PyList_Type': exports5['libpython3.14.so:PyList_Type'],
        'libpython3.14.so:PyLongRangeIter_Type': exports5['libpython3.14.so:PyLongRangeIter_Type'],
        'libpython3.14.so:PyLong_Type': exports5['libpython3.14.so:PyLong_Type'],
        'libpython3.14.so:PyMap_Type': exports5['libpython3.14.so:PyMap_Type'],
        'libpython3.14.so:PyMemberDescr_Type': exports5['libpython3.14.so:PyMemberDescr_Type'],
        'libpython3.14.so:PyMemoryView_Type': exports5['libpython3.14.so:PyMemoryView_Type'],
        'libpython3.14.so:PyMethodDescr_Type': exports5['libpython3.14.so:PyMethodDescr_Type'],
        'libpython3.14.so:PyMethod_Type': exports5['libpython3.14.so:PyMethod_Type'],
        'libpython3.14.so:PyModuleDef_Type': exports5['libpython3.14.so:PyModuleDef_Type'],
        'libpython3.14.so:PyModule_Type': exports5['libpython3.14.so:PyModule_Type'],
        'libpython3.14.so:PyODictItems_Type': exports5['libpython3.14.so:PyODictItems_Type'],
        'libpython3.14.so:PyODictIter_Type': exports5['libpython3.14.so:PyODictIter_Type'],
        'libpython3.14.so:PyODictKeys_Type': exports5['libpython3.14.so:PyODictKeys_Type'],
        'libpython3.14.so:PyODictValues_Type': exports5['libpython3.14.so:PyODictValues_Type'],
        'libpython3.14.so:PyODict_Type': exports5['libpython3.14.so:PyODict_Type'],
        'libpython3.14.so:PyOS_InputHook': exports5['libpython3.14.so:PyOS_InputHook'],
        'libpython3.14.so:PyOS_ReadlineFunctionPointer': exports5['libpython3.14.so:PyOS_ReadlineFunctionPointer'],
        'libpython3.14.so:PyPickleBuffer_Type': exports5['libpython3.14.so:PyPickleBuffer_Type'],
        'libpython3.14.so:PyProperty_Type': exports5['libpython3.14.so:PyProperty_Type'],
        'libpython3.14.so:PyRangeIter_Type': exports5['libpython3.14.so:PyRangeIter_Type'],
        'libpython3.14.so:PyRange_Type': exports5['libpython3.14.so:PyRange_Type'],
        'libpython3.14.so:PyReversed_Type': exports5['libpython3.14.so:PyReversed_Type'],
        'libpython3.14.so:PySeqIter_Type': exports5['libpython3.14.so:PySeqIter_Type'],
        'libpython3.14.so:PySetIter_Type': exports5['libpython3.14.so:PySetIter_Type'],
        'libpython3.14.so:PySet_Type': exports5['libpython3.14.so:PySet_Type'],
        'libpython3.14.so:PySlice_Type': exports5['libpython3.14.so:PySlice_Type'],
        'libpython3.14.so:PyStaticMethod_Type': exports5['libpython3.14.so:PyStaticMethod_Type'],
        'libpython3.14.so:PyStdPrinter_Type': exports5['libpython3.14.so:PyStdPrinter_Type'],
        'libpython3.14.so:PyStructSequence_UnnamedField': exports5['libpython3.14.so:PyStructSequence_UnnamedField'],
        'libpython3.14.so:PySuper_Type': exports5['libpython3.14.so:PySuper_Type'],
        'libpython3.14.so:PyTraceBack_Type': exports5['libpython3.14.so:PyTraceBack_Type'],
        'libpython3.14.so:PyTupleIter_Type': exports5['libpython3.14.so:PyTupleIter_Type'],
        'libpython3.14.so:PyTuple_Type': exports5['libpython3.14.so:PyTuple_Type'],
        'libpython3.14.so:PyType_Type': exports5['libpython3.14.so:PyType_Type'],
        'libpython3.14.so:PyUnicodeIter_Type': exports5['libpython3.14.so:PyUnicodeIter_Type'],
        'libpython3.14.so:PyUnicode_Type': exports5['libpython3.14.so:PyUnicode_Type'],
        'libpython3.14.so:PyWrapperDescr_Type': exports5['libpython3.14.so:PyWrapperDescr_Type'],
        'libpython3.14.so:PyZip_Type': exports5['libpython3.14.so:PyZip_Type'],
        'libpython3.14.so:Py_BytesWarningFlag': exports5['libpython3.14.so:Py_BytesWarningFlag'],
        'libpython3.14.so:Py_DebugFlag': exports5['libpython3.14.so:Py_DebugFlag'],
        'libpython3.14.so:Py_DontWriteBytecodeFlag': exports5['libpython3.14.so:Py_DontWriteBytecodeFlag'],
        'libpython3.14.so:Py_FileSystemDefaultEncodeErrors': exports5['libpython3.14.so:Py_FileSystemDefaultEncodeErrors'],
        'libpython3.14.so:Py_FileSystemDefaultEncoding': exports5['libpython3.14.so:Py_FileSystemDefaultEncoding'],
        'libpython3.14.so:Py_FrozenFlag': exports5['libpython3.14.so:Py_FrozenFlag'],
        'libpython3.14.so:Py_GenericAliasType': exports5['libpython3.14.so:Py_GenericAliasType'],
        'libpython3.14.so:Py_HasFileSystemDefaultEncoding': exports5['libpython3.14.so:Py_HasFileSystemDefaultEncoding'],
        'libpython3.14.so:Py_HashRandomizationFlag': exports5['libpython3.14.so:Py_HashRandomizationFlag'],
        'libpython3.14.so:Py_IgnoreEnvironmentFlag': exports5['libpython3.14.so:Py_IgnoreEnvironmentFlag'],
        'libpython3.14.so:Py_InspectFlag': exports5['libpython3.14.so:Py_InspectFlag'],
        'libpython3.14.so:Py_InteractiveFlag': exports5['libpython3.14.so:Py_InteractiveFlag'],
        'libpython3.14.so:Py_IsolatedFlag': exports5['libpython3.14.so:Py_IsolatedFlag'],
        'libpython3.14.so:Py_NoSiteFlag': exports5['libpython3.14.so:Py_NoSiteFlag'],
        'libpython3.14.so:Py_NoUserSiteDirectory': exports5['libpython3.14.so:Py_NoUserSiteDirectory'],
        'libpython3.14.so:Py_OptimizeFlag': exports5['libpython3.14.so:Py_OptimizeFlag'],
        'libpython3.14.so:Py_QuietFlag': exports5['libpython3.14.so:Py_QuietFlag'],
        'libpython3.14.so:Py_UTF8Mode': exports5['libpython3.14.so:Py_UTF8Mode'],
        'libpython3.14.so:Py_UnbufferedStdioFlag': exports5['libpython3.14.so:Py_UnbufferedStdioFlag'],
        'libpython3.14.so:Py_VerboseFlag': exports5['libpython3.14.so:Py_VerboseFlag'],
        'libpython3.14.so:Py_hexdigits': exports5['libpython3.14.so:Py_hexdigits'],
        'libpython3.14.so:_CLOCK_MONOTONIC': exports5['libpython3.14.so:_CLOCK_MONOTONIC'],
        'libpython3.14.so:_CLOCK_REALTIME': exports5['libpython3.14.so:_CLOCK_REALTIME'],
        'libpython3.14.so:_PyAsyncGenASend_Type': exports5['libpython3.14.so:_PyAsyncGenASend_Type'],
        'libpython3.14.so:_PyByteArray_empty_string': exports5['libpython3.14.so:_PyByteArray_empty_string'],
        'libpython3.14.so:_PyEval_BinaryOps': exports5['libpython3.14.so:_PyEval_BinaryOps'],
        'libpython3.14.so:_PyEval_ConversionFuncs': exports5['libpython3.14.so:_PyEval_ConversionFuncs'],
        'libpython3.14.so:_PyExc_IncompleteInputError': exports5['libpython3.14.so:_PyExc_IncompleteInputError'],
        'libpython3.14.so:_PyImport_FrozenBootstrap': exports5['libpython3.14.so:_PyImport_FrozenBootstrap'],
        'libpython3.14.so:_PyImport_FrozenStdlib': exports5['libpython3.14.so:_PyImport_FrozenStdlib'],
        'libpython3.14.so:_PyImport_FrozenTest': exports5['libpython3.14.so:_PyImport_FrozenTest'],
        'libpython3.14.so:_PyIntrinsics_BinaryFunctions': exports5['libpython3.14.so:_PyIntrinsics_BinaryFunctions'],
        'libpython3.14.so:_PyIntrinsics_UnaryFunctions': exports5['libpython3.14.so:_PyIntrinsics_UnaryFunctions'],
        'libpython3.14.so:_PyLong_DigitValue': exports5['libpython3.14.so:_PyLong_DigitValue'],
        'libpython3.14.so:_PyNone_Type': exports5['libpython3.14.so:_PyNone_Type'],
        'libpython3.14.so:_PyNotImplemented_Type': exports5['libpython3.14.so:_PyNotImplemented_Type'],
        'libpython3.14.so:_PyOS_ReadlineTState': exports5['libpython3.14.so:_PyOS_ReadlineTState'],
        'libpython3.14.so:_PyRuntime': exports5['libpython3.14.so:_PyRuntime'],
        'libpython3.14.so:_PyUnion_Type': exports5['libpython3.14.so:_PyUnion_Type'],
        'libpython3.14.so:_PyWeakref_CallableProxyType': exports5['libpython3.14.so:_PyWeakref_CallableProxyType'],
        'libpython3.14.so:_PyWeakref_ProxyType': exports5['libpython3.14.so:_PyWeakref_ProxyType'],
        'libpython3.14.so:_PyWeakref_RefType': exports5['libpython3.14.so:_PyWeakref_RefType'],
        'libpython3.14.so:_Py_EllipsisObject': exports5['libpython3.14.so:_Py_EllipsisObject'],
        'libpython3.14.so:_Py_FalseStruct': exports5['libpython3.14.so:_Py_FalseStruct'],
        'libpython3.14.so:_Py_FunctionAttributeOffsets': exports5['libpython3.14.so:_Py_FunctionAttributeOffsets'],
        'libpython3.14.so:_Py_HashSecret': exports5['libpython3.14.so:_Py_HashSecret'],
        'libpython3.14.so:_Py_InitCleanup': exports5['libpython3.14.so:_Py_InitCleanup'],
        'libpython3.14.so:_Py_NoneStruct': exports5['libpython3.14.so:_Py_NoneStruct'],
        'libpython3.14.so:_Py_NotImplementedStruct': exports5['libpython3.14.so:_Py_NotImplementedStruct'],
        'libpython3.14.so:_Py_SpecialMethods': exports5['libpython3.14.so:_Py_SpecialMethods'],
        'libpython3.14.so:_Py_SwappedOp': exports5['libpython3.14.so:_Py_SwappedOp'],
        'libpython3.14.so:_Py_TrueStruct': exports5['libpython3.14.so:_Py_TrueStruct'],
        'libpython3.14.so:_Py_ascii_whitespace': exports5['libpython3.14.so:_Py_ascii_whitespace'],
        'libpython3.14.so:_Py_ctype_table': exports5['libpython3.14.so:_Py_ctype_table'],
        'libpython3.14.so:_Py_ctype_tolower': exports5['libpython3.14.so:_Py_ctype_tolower'],
        'libpython3.14.so:_Py_ctype_toupper': exports5['libpython3.14.so:_Py_ctype_toupper'],
        'libpython3.14.so:environ': exports5['libpython3.14.so:environ'],
        'libpython3.14.so:errno': exports5['libpython3.14.so:errno'],
        'libpython3.14.so:h_errno': exports5['libpython3.14.so:h_errno'],
        'libpython3.14.so:memory_base': exports5['libpython3.14.so:memory_base'],
        'libpython3.14.so:stderr': exports5['libpython3.14.so:stderr'],
        'libpython3.14.so:stdin': exports5['libpython3.14.so:stdin'],
        'libpython3.14.so:stdout': exports5['libpython3.14.so:stdout'],
        'libwasi-emulated-process-clocks.so:errno': exports5['libwasi-emulated-process-clocks.so:errno'],
        'libwasi-emulated-signal.so:errno': exports5['libwasi-emulated-signal.so:errno'],
        'libwasi-emulated-signal.so:stderr': exports5['libwasi-emulated-signal.so:stderr'],
        memory: exports5.memory,
      },
      'libc.so': {
        _CLOCK_MONOTONIC: exports11._CLOCK_MONOTONIC,
        _CLOCK_REALTIME: exports11._CLOCK_REALTIME,
        _IO_feof_unlocked: exports11.feof,
        _IO_ferror_unlocked: exports11.ferror,
        _IO_getc: exports11.getc,
        _IO_getc_unlocked: exports11.getc_unlocked,
        _IO_putc: exports11.putc,
        _IO_putc_unlocked: exports11.putc_unlocked,
        __freelocale: exports11.freelocale,
        __getdelim: exports11.getdelim,
        __isoc99_fscanf: exports11.fscanf,
        __isoc99_fwscanf: exports11.fwscanf,
        __isoc99_scanf: exports11.scanf,
        __isoc99_sscanf: exports11.sscanf,
        __isoc99_swscanf: exports11.swscanf,
        __isoc99_vfscanf: exports11.vfscanf,
        __isoc99_vfwscanf: exports11.vfwscanf,
        __isoc99_vscanf: exports11.vscanf,
        __isoc99_vsscanf: exports11.vsscanf,
        __isoc99_vswscanf: exports11.vswscanf,
        __isoc99_vwscanf: exports11.vwscanf,
        __isoc99_wscanf: exports11.wscanf,
        __lctrans_cur: exports11.__lctrans_cur,
        __main_void: exports11.__main_void,
        __optpos: exports11.__optpos,
        __optreset: exports11.__optreset,
        __posix_getopt: exports11.getopt,
        __signgam: exports11.__signgam,
        __small_printf: exports11.printf,
        __stack_chk_guard: exports11.__stack_chk_guard,
        __strtod_l: exports11.strtod_l,
        __strtof_l: exports11.strtof_l,
        __strtoimax_internal: exports11.strtoimax,
        __strtol_internal: exports11.strtol,
        __strtold_l: exports11.strtold_l,
        __strtoll_internal: exports11.strtoll,
        __strtoul_internal: exports11.strtoul,
        __strtoull_internal: exports11.strtoull,
        __strtoumax_internal: exports11.strtoumax,
        __wasi_sockets_services_db: exports11.__wasi_sockets_services_db,
        __wasilibc_cwd: exports11.__wasilibc_cwd,
        __wasilibc_environ: exports11.__wasilibc_environ,
        __wasilibc_find_relpath: exports11.__wasilibc_find_relpath,
        __wasilibc_find_relpath_alloc: exports11.__wasilibc_find_relpath_alloc,
        __wasilibc_get_environ: exports11.__wasilibc_get_environ,
        __wasilibc_pthread_self: exports11.__wasilibc_pthread_self,
        __wasilibc_reset_preopens: exports11.__wasilibc_reset_preopens,
        __wasilibc_tell: exports11.__wasilibc_tell,
        __wasm_apply_data_relocs: exports11.__wasm_apply_data_relocs,
        __xpg_basename: exports11.basename,
        __xpg_strerror_r: exports11.strerror_r,
        _exit: exports11._Exit,
        _initialize: exports11._initialize,
        abort: exports11.abort,
        accept: exports11.accept,
        accept4: exports11.accept4,
        access: exports11.access,
        acos: exports11.acos,
        acosh: exports11.acosh,
        alphasort64: exports11.alphasort,
        asctime_r: exports11.asctime_r,
        asin: exports11.asin,
        asinh: exports11.asinh,
        atan: exports11.atan,
        atan2: exports11.atan2,
        atanh: exports11.atanh,
        atexit: exports11.atexit,
        bind: exports11.bind,
        calloc: exports11.calloc,
        cbrt: exports11.cbrt,
        chdir: exports11.chdir,
        clearerr: exports11.clearerr,
        clearerr_unlocked: exports11.clearerr,
        clock_getres: exports11.clock_getres,
        clock_gettime: exports11.clock_gettime,
        clock_nanosleep: exports11.clock_nanosleep,
        close: exports11.close,
        closedir: exports11.closedir,
        confstr: exports11.confstr,
        connect: exports11.connect,
        copysign: exports11.copysign,
        cos: exports11.cos,
        cosh: exports11.cosh,
        creat64: exports11.creat,
        crypt_r: exports11.crypt_r,
        drem: exports11.remainder,
        dremf: exports11.remainderf,
        duplocale: exports11.__duplocale,
        environ: exports11.environ,
        erf: exports11.erf,
        erfc: exports11.erfc,
        errno: exports11.errno,
        exit: exports11.exit,
        exp: exports11.exp,
        exp2: exports11.exp2,
        expm1: exports11.expm1,
        fabs: exports11.fabs,
        faccessat: exports11.faccessat,
        fclose: exports11.fclose,
        fcntl: exports11.fcntl,
        fdatasync: exports11.fdatasync,
        fdopen: exports11.fdopen,
        feof: exports11.feof,
        feof_unlocked: exports11.feof,
        ferror: exports11.ferror,
        ferror_unlocked: exports11.ferror,
        fflush: exports11.fflush,
        fflush_unlocked: exports11.fflush,
        fgetc_unlocked: exports11.getc_unlocked,
        fgetpos64: exports11.fgetpos,
        fgets: exports11.fgets,
        fgets_unlocked: exports11.fgets,
        fgetwc_unlocked: exports11.__fgetwc_unlocked,
        fgetws_unlocked: exports11.fgetws,
        fileno: exports11.fileno,
        fileno_unlocked: exports11.fileno,
        fma: exports11.fma,
        fmod: exports11.fmod,
        fopen: exports11.fopen,
        fopen64: exports11.fopen,
        fopencookie: exports11.fopencookie,
        fpathconf: exports11.fpathconf,
        fprintf: exports11.fprintf,
        fpurge: exports11.__fpurge,
        fputc: exports11.fputc,
        fputc_unlocked: exports11.putc_unlocked,
        fputs: exports11.fputs,
        fputs_unlocked: exports11.fputs,
        fputwc_unlocked: exports11.__fputwc_unlocked,
        fputws_unlocked: exports11.fputws,
        fread: exports11.fread,
        fread_unlocked: exports11.fread,
        free: exports11.free,
        freeaddrinfo: exports11.freeaddrinfo,
        freopen64: exports11.freopen,
        frexp: exports11.frexp,
        fseeko: exports11.fseeko,
        fseeko64: exports11.fseeko,
        fsetpos64: exports11.fsetpos,
        fstat: exports11.fstat,
        fstatat: exports11.fstatat,
        fsync: exports11.fsync,
        ftell: exports11.ftell,
        ftello: exports11.ftello,
        ftello64: exports11.ftello,
        ftruncate: exports11.ftruncate,
        futimens: exports11.futimens,
        futimesat: exports11.futimesat,
        fwrite: exports11.fwrite,
        fwrite_unlocked: exports11.fwrite,
        gai_strerror: exports11.gai_strerror,
        getaddrinfo: exports11.getaddrinfo,
        getc: exports11.getc,
        getcwd: exports11.getcwd,
        getdate_err: exports11.getdate_err,
        getentropy: exports11.__getentropy,
        getenv: exports11.getenv,
        gethostbyaddr: exports11.gethostbyaddr,
        gethostbyname: exports11.gethostbyname,
        getnameinfo: exports11.getnameinfo,
        getpeername: exports11.getpeername,
        getprotobyname: exports11.getprotobyname,
        getservbyname: exports11.getservbyname,
        getservbyport: exports11.getservbyport,
        getsockname: exports11.getsockname,
        getsockopt: exports11.getsockopt,
        gettimeofday: exports11.gettimeofday,
        getwc_unlocked: exports11.__fgetwc_unlocked,
        getwchar_unlocked: exports11.getwchar,
        glob64: exports11.glob,
        globfree64: exports11.globfree,
        gmtime_r: exports11.gmtime_r,
        h_errno: exports11.h_errno,
        hcreate_r: exports11.hcreate_r,
        hdestroy_r: exports11.hdestroy_r,
        hsearch_r: exports11.hsearch_r,
        hstrerror: exports11.hstrerror,
        htonl: exports11.htonl,
        htons: exports11.htons,
        hypot: exports11.hypot,
        inet_aton: exports11.inet_aton,
        inet_ntop: exports11.inet_ntop,
        inet_pton: exports11.inet_pton,
        ioctl: exports11.ioctl,
        iprintf: exports11.printf,
        isalnum: exports11.isalnum,
        isalnum_l: exports11.__isalnum_l,
        isalpha_l: exports11.__isalpha_l,
        isatty: exports11.__isatty,
        isblank_l: exports11.__isblank_l,
        iscntrl_l: exports11.__iscntrl_l,
        isdigit_l: exports11.__isdigit_l,
        isgraph_l: exports11.__isgraph_l,
        islower_l: exports11.__islower_l,
        isprint_l: exports11.__isprint_l,
        ispunct_l: exports11.__ispunct_l,
        isspace_l: exports11.__isspace_l,
        isupper_l: exports11.__isupper_l,
        iswalnum_l: exports11.__iswalnum_l,
        iswalpha_l: exports11.__iswalpha_l,
        iswblank_l: exports11.__iswblank_l,
        iswcntrl_l: exports11.__iswcntrl_l,
        iswctype_l: exports11.__iswctype_l,
        iswdigit_l: exports11.__iswdigit_l,
        iswgraph_l: exports11.__iswgraph_l,
        iswlower_l: exports11.__iswlower_l,
        iswprint_l: exports11.__iswprint_l,
        iswpunct_l: exports11.__iswpunct_l,
        iswspace_l: exports11.__iswspace_l,
        iswupper_l: exports11.__iswupper_l,
        iswxdigit_l: exports11.__iswxdigit_l,
        isxdigit_l: exports11.__isxdigit_l,
        ldexp: exports11.ldexp,
        lgamma_r: exports11.lgamma_r,
        lgammaf_r: exports11.lgammaf_r,
        lgammal_r: exports11.__lgammal_r,
        link: exports11.link,
        listen: exports11.listen,
        localeconv: exports11.localeconv,
        localtime_r: exports11.localtime_r,
        log: exports11.log,
        log10: exports11.log10,
        log1p: exports11.log1p,
        log2: exports11.log2,
        lseek: exports11.lseek,
        lstat: exports11.lstat,
        malloc: exports11.malloc,
        mbrtowc: exports11.mbrtowc,
        mbstowcs: exports11.mbstowcs,
        memchr: exports11.memchr,
        memcmp: exports11.memcmp,
        memrchr: exports11.memrchr,
        mkdir: exports11.mkdir,
        mkdirat: exports11.mkdirat,
        mktime: exports11.mktime,
        modf: exports11.modf,
        newlocale: exports11.__newlocale,
        nextafter: exports11.nextafter,
        nftw64: exports11.nftw,
        nl_langinfo: exports11.__nl_langinfo,
        nl_langinfo_l: exports11.__nl_langinfo_l,
        ntohl: exports11.ntohl,
        ntohs: exports11.ntohs,
        open: exports11.open,
        openat: exports11.openat,
        opendir: exports11.opendir,
        optarg: exports11.optarg,
        opterr: exports11.opterr,
        optind: exports11.optind,
        optopt: exports11.optopt,
        pathconf: exports11.pathconf,
        poll: exports11.poll,
        posix_fadvise: exports11.posix_fadvise,
        posix_memalign: exports11.posix_memalign,
        pow: exports11.pow,
        pow10: exports11.exp10,
        pow10f: exports11.exp10f,
        pow10l: exports11.exp10l,
        pread: exports11.pread,
        printf: exports11.printf,
        pthread_attr_destroy: exports11.pthread_attr_destroy,
        pthread_attr_getguardsize: exports11.pthread_attr_getguardsize,
        pthread_attr_getstack: exports11.pthread_attr_getstack,
        pthread_attr_init: exports11.pthread_attr_init,
        pthread_attr_setstacksize: exports11.pthread_attr_setstacksize,
        pthread_cond_destroy: exports11.pthread_cond_destroy,
        pthread_cond_init: exports11.pthread_cond_init,
        pthread_cond_signal: exports11.pthread_cond_signal,
        pthread_cond_timedwait: exports11.pthread_cond_timedwait,
        pthread_cond_wait: exports11.pthread_cond_wait,
        pthread_condattr_init: exports11.pthread_condattr_init,
        pthread_condattr_setclock: exports11.pthread_condattr_setclock,
        pthread_create: exports11.pthread_create,
        pthread_detach: exports11.pthread_detach,
        pthread_equal: exports11.pthread_equal,
        pthread_getattr_np: exports11.pthread_getattr_np,
        pthread_getspecific: exports11.pthread_getspecific,
        pthread_join: exports11.pthread_join,
        pthread_key_create: exports11.pthread_key_create,
        pthread_key_delete: exports11.pthread_key_delete,
        pthread_mutex_destroy: exports11.pthread_mutex_destroy,
        pthread_mutex_init: exports11.pthread_mutex_init,
        pthread_mutex_lock: exports11.pthread_mutex_lock,
        pthread_mutex_timedlock: exports11.pthread_mutex_timedlock,
        pthread_mutex_trylock: exports11.pthread_mutex_trylock,
        pthread_mutex_unlock: exports11.pthread_mutex_unlock,
        pthread_once: exports11.pthread_once,
        pthread_rwlock_rdlock: exports11.pthread_rwlock_rdlock,
        pthread_rwlock_timedrdlock: exports11.pthread_rwlock_timedrdlock,
        pthread_rwlock_timedwrlock: exports11.pthread_rwlock_timedwrlock,
        pthread_rwlock_tryrdlock: exports11.pthread_rwlock_tryrdlock,
        pthread_rwlock_trywrlock: exports11.pthread_rwlock_trywrlock,
        pthread_rwlock_unlock: exports11.pthread_rwlock_unlock,
        pthread_rwlock_wrlock: exports11.pthread_rwlock_wrlock,
        pthread_self: exports11.pthread_self,
        pthread_setcancelstate: exports11.pthread_setcancelstate,
        pthread_setspecific: exports11.pthread_setspecific,
        pthread_testcancel: exports11.pthread_testcancel,
        pthread_timedjoin_np: exports11.pthread_timedjoin_np,
        pthread_tryjoin_np: exports11.pthread_tryjoin_np,
        putchar: exports11.putchar,
        puts: exports11.puts,
        putwc_unlocked: exports11.__fputwc_unlocked,
        putwchar_unlocked: exports11.putwchar,
        pwrite: exports11.pwrite,
        qsort_r: exports11.qsort_r,
        read: exports11.read,
        readdir: exports11.readdir,
        readlink: exports11.readlink,
        readlinkat: exports11.readlinkat,
        realloc: exports11.realloc,
        reallocarray: exports11.__reallocarray,
        realpath: exports11.realpath,
        recv: exports11.recv,
        recvfrom: exports11.recvfrom,
        rename: exports11.rename,
        renameat: exports11.renameat,
        rewind: exports11.rewind,
        rmdir: exports11.rmdir,
        round: exports11.round,
        sbrk: exports11.sbrk,
        sched_yield: exports11.sched_yield,
        select: exports11.select,
        send: exports11.send,
        sendto: exports11.sendto,
        setenv: exports11.setenv,
        setlocale: exports11.setlocale,
        setsockopt: exports11.setsockopt,
        setvbuf: exports11.setvbuf,
        shutdown: exports11.shutdown,
        sin: exports11.sin,
        sinh: exports11.sinh,
        sleep: exports11.sleep,
        snprintf: exports11.snprintf,
        socket: exports11.socket,
        sprintf: exports11.sprintf,
        sqrt: exports11.sqrt,
        stat: exports11.stat,
        stderr: exports11.stderr,
        stdin: exports11.stdin,
        stdout: exports11.stdout,
        stpcpy: exports11.stpcpy,
        stpncpy: exports11.stpncpy,
        strcasecmp_l: exports11.__strcasecmp_l,
        strchr: exports11.strchr,
        strchrnul: exports11.strchrnul,
        strcmp: exports11.strcmp,
        strcoll_l: exports11.__strcoll_l,
        strcpy: exports11.strcpy,
        strcspn: exports11.strcspn,
        strdup: exports11.strdup,
        strerror: exports11.strerror,
        strerror_l: exports11.__strerror_l,
        strerror_r: exports11.strerror_r,
        strftime_l: exports11.strftime_l,
        strlen: exports11.strlen,
        strncasecmp_l: exports11.__strncasecmp_l,
        strncat: exports11.strncat,
        strncmp: exports11.strncmp,
        strncpy: exports11.strncpy,
        strpbrk: exports11.strpbrk,
        strrchr: exports11.strrchr,
        strstr: exports11.strstr,
        strtol: exports11.strtol,
        strtoul: exports11.strtoul,
        strxfrm_l: exports11.__strxfrm_l,
        symlink: exports11.symlink,
        symlinkat: exports11.symlinkat,
        sysconf: exports11.sysconf,
        tan: exports11.tan,
        tanh: exports11.tanh,
        thrd_current: exports11.pthread_self,
        thrd_detach: exports11.pthread_detach,
        thrd_equal: exports11.pthread_equal,
        time: exports11.time,
        tolower: exports11.tolower,
        tolower_l: exports11.__tolower_l,
        toupper: exports11.toupper,
        toupper_l: exports11.__toupper_l,
        towctrans_l: exports11.__towctrans_l,
        towlower_l: exports11.__towlower_l,
        towupper_l: exports11.__towupper_l,
        truncate: exports11.truncate,
        tss_get: exports11.pthread_getspecific,
        uname: exports11.uname,
        ungetc: exports11.ungetc,
        unlink: exports11.unlink,
        unlinkat: exports11.unlinkat,
        unsetenv: exports11.unsetenv,
        uselocale: exports11.__uselocale,
        utimensat: exports11.utimensat,
        versionsort64: exports11.versionsort,
        vfprintf: exports11.vfprintf,
        vsnprintf: exports11.vsnprintf,
        wcschr: exports11.wcschr,
        wcscmp: exports11.wcscmp,
        wcscoll: exports11.wcscoll,
        wcscoll_l: exports11.__wcscoll_l,
        wcscpy: exports11.wcscpy,
        wcsftime: exports11.wcsftime,
        wcsftime_l: exports11.__wcsftime_l,
        wcslen: exports11.wcslen,
        wcsncmp: exports11.wcsncmp,
        wcsncpy: exports11.wcsncpy,
        wcsrchr: exports11.wcsrchr,
        wcstok: exports11.wcstok,
        wcstol: exports11.wcstol,
        wcstombs: exports11.wcstombs,
        wcsxfrm: exports11.wcsxfrm,
        wcsxfrm_l: exports11.__wcsxfrm_l,
        wctrans_l: exports11.__wctrans_l,
        wctype_l: exports11.__wctype_l,
        wmemchr: exports11.wmemchr,
        wmemcmp: exports11.wmemcmp,
        write: exports11.write,
      },
      'libcomponentize_py_bindings.so': {
        'componentize-py#CallIndirect': exports12['componentize-py#CallIndirect'],
      },
      'libcomponentize_py_runtime.so': {
        PyInit_componentize_py_runtime: exports8.PyInit_componentize_py_runtime,
        _CLOCK_PROCESS_CPUTIME_ID: exports8._CLOCK_PROCESS_CPUTIME_ID,
        _CLOCK_THREAD_CPUTIME_ID: exports8._CLOCK_THREAD_CPUTIME_ID,
        '_ZN106_$LT$$LT$std..path..Iter$u20$as$u20$core..fmt..Debug$GT$..fmt..DebugHelper$u20$as$u20$core..fmt..Debug$GT$3fmt17hdcdd660a0dcbc067E': exports8['_ZN106_$LT$$LT$std..path..Iter$u20$as$u20$core..fmt..Debug$GT$..fmt..DebugHelper$u20$as$u20$core..fmt..Debug$GT$3fmt17hdcdd660a0dcbc067E'],
        '_ZN112_$LT$$LT$std..path..Components$u20$as$u20$core..fmt..Debug$GT$..fmt..DebugHelper$u20$as$u20$core..fmt..Debug$GT$3fmt17he5af58d0465550b1E': exports8['_ZN112_$LT$$LT$std..path..Components$u20$as$u20$core..fmt..Debug$GT$..fmt..DebugHelper$u20$as$u20$core..fmt..Debug$GT$3fmt17he5af58d0465550b1E'],
        '_ZN254_$LT$alloc..boxed..convert..$LT$impl$u20$core..convert..From$LT$alloc..string..String$GT$$u20$for$u20$alloc..boxed..Box$LT$dyn$u20$core..error..Error$u2b$core..marker..Sync$u2b$core..marker..Send$GT$$GT$..from..StringError$u20$as$u20$core..fmt..Debug$GT$3fmt17h3a4878bbde23e277E': exports8['_ZN254_$LT$alloc..boxed..convert..$LT$impl$u20$core..convert..From$LT$alloc..string..String$GT$$u20$for$u20$alloc..boxed..Box$LT$dyn$u20$core..error..Error$u2b$core..marker..Sync$u2b$core..marker..Send$GT$$GT$..from..StringError$u20$as$u20$core..fmt..Debug$GT$3fmt17h3a4878bbde23e277E'],
        '_ZN256_$LT$alloc..boxed..convert..$LT$impl$u20$core..convert..From$LT$alloc..string..String$GT$$u20$for$u20$alloc..boxed..Box$LT$dyn$u20$core..error..Error$u2b$core..marker..Sync$u2b$core..marker..Send$GT$$GT$..from..StringError$u20$as$u20$core..fmt..Display$GT$3fmt17h4f43cd4e69575bf2E': exports8['_ZN256_$LT$alloc..boxed..convert..$LT$impl$u20$core..convert..From$LT$alloc..string..String$GT$$u20$for$u20$alloc..boxed..Box$LT$dyn$u20$core..error..Error$u2b$core..marker..Sync$u2b$core..marker..Send$GT$$GT$..from..StringError$u20$as$u20$core..fmt..Display$GT$3fmt17h4f43cd4e69575bf2E'],
        _ZN3std2io5stdio6stderr8INSTANCE17h8ff5d5e318e80a25E: exports8._ZN3std2io5stdio6stderr8INSTANCE17h8ff5d5e318e80a25E,
        _ZN3std4hash6random11RandomState3new4KEYS28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17h746d1020d9bcb391E: exports8._ZN3std4hash6random11RandomState3new4KEYS28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17h746d1020d9bcb391E,
        _ZN3std4sync4mpmc5waker17current_thread_id5DUMMY28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17hc9a0250b98262fd5E: exports8._ZN3std4sync4mpmc5waker17current_thread_id5DUMMY28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17hc9a0250b98262fd5E,
        _ZN3std5alloc24default_alloc_error_hook17h3216307ca4cce97cE: exports8._ZN3std5alloc24default_alloc_error_hook17h3216307ca4cce97cE,
        _ZN3std5alloc4HOOK17h20769bdf4aef60c1E: exports8._ZN3std5alloc4HOOK17h20769bdf4aef60c1E,
        _ZN3std6thread7current2id2ID17hf767b40513ccbad0E: exports8._ZN3std6thread7current2id2ID17hf767b40513ccbad0E,
        _ZN3std6thread7current7CURRENT17h5d5fadd57b31de29E: exports8._ZN3std6thread7current7CURRENT17h5d5fadd57b31de29E,
        _ZN3std6thread9spawnhook11SPAWN_HOOKS28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17ha8c951123c883964E: exports8._ZN3std6thread9spawnhook11SPAWN_HOOKS28_$u7b$$u7b$closure$u7d$$u7d$23__RUST_STD_INTERNAL_VAL17ha8c951123c883964E,
        _ZN3std9panicking11panic_count18GLOBAL_PANIC_COUNT17h0e9afc33c554212dE: exports8._ZN3std9panicking11panic_count18GLOBAL_PANIC_COUNT17h0e9afc33c554212dE,
        _ZN3std9panicking4HOOK17he27851ff2a95e3bcE: exports8._ZN3std9panicking4HOOK17he27851ff2a95e3bcE,
        '_ZN41_$LT$char$u20$as$u20$core..fmt..Debug$GT$3fmt17h90cd0ef296fab958E': exports8['_ZN41_$LT$char$u20$as$u20$core..fmt..Debug$GT$3fmt17h90cd0ef296fab958E'],
        '_ZN43_$LT$char$u20$as$u20$core..fmt..Display$GT$3fmt17h989f15e63f93bb2fE': exports8['_ZN43_$LT$char$u20$as$u20$core..fmt..Display$GT$3fmt17h989f15e63f93bb2fE'],
        '_ZN4core3fmt3num3imp51_$LT$impl$u20$core..fmt..Display$u20$for$u20$u8$GT$3fmt17h136e0f9a094e2e15E': exports8['_ZN4core3fmt3num3imp51_$LT$impl$u20$core..fmt..Display$u20$for$u20$u8$GT$3fmt17h136e0f9a094e2e15E'],
        '_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$i32$GT$3fmt17h8c24a65babf8ec37E': exports8['_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$i32$GT$3fmt17h8c24a65babf8ec37E'],
        '_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$u16$GT$3fmt17h8942d36f21f5185aE': exports8['_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$u16$GT$3fmt17h8942d36f21f5185aE'],
        '_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$u32$GT$3fmt17h56ed463b63659d02E': exports8['_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$u32$GT$3fmt17h56ed463b63659d02E'],
        '_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$u64$GT$3fmt17h55e6591dee6b4c17E': exports8['_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$u64$GT$3fmt17h55e6591dee6b4c17E'],
        '_ZN4core3fmt3num3imp54_$LT$impl$u20$core..fmt..Display$u20$for$u20$isize$GT$3fmt17h7fe33f5715fa01e7E': exports8['_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$i32$GT$3fmt17h8c24a65babf8ec37E'],
        '_ZN4core3fmt3num3imp54_$LT$impl$u20$core..fmt..Display$u20$for$u20$usize$GT$3fmt17hc5537ffb0eb93b52E': exports8['_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$u32$GT$3fmt17h56ed463b63659d02E'],
        '_ZN4core3fmt3num52_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u8$GT$3fmt17hd4cf5a9874b94f15E': exports8['_ZN4core3fmt3num52_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u8$GT$3fmt17hd4cf5a9874b94f15E'],
        '_ZN4core3fmt3num52_$LT$impl$u20$core..fmt..UpperHex$u20$for$u20$u8$GT$3fmt17h5ac90fabcb1f9818E': exports8['_ZN4core3fmt3num52_$LT$impl$u20$core..fmt..UpperHex$u20$for$u20$u8$GT$3fmt17h5ac90fabcb1f9818E'],
        '_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u16$GT$3fmt17h9e47e7df57729d28E': exports8['_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u16$GT$3fmt17h9e47e7df57729d28E'],
        '_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u32$GT$3fmt17hb8cbf9f24d2b5cdeE': exports8['_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u32$GT$3fmt17hb8cbf9f24d2b5cdeE'],
        '_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..UpperHex$u20$for$u20$u16$GT$3fmt17h189609f59218c372E': exports8['_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..UpperHex$u20$for$u20$u16$GT$3fmt17h189609f59218c372E'],
        '_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..UpperHex$u20$for$u20$u32$GT$3fmt17h37d40201ca36bec3E': exports8['_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..UpperHex$u20$for$u20$u32$GT$3fmt17h37d40201ca36bec3E'],
        '_ZN4core3fmt3num54_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u128$GT$3fmt17h99db017386d32ad7E': exports8['_ZN4core3fmt3num54_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u128$GT$3fmt17h99db017386d32ad7E'],
        '_ZN4core3fmt3num55_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$usize$GT$3fmt17h1cc9c3c35dba6e6cE': exports8['_ZN4core3fmt3num53_$LT$impl$u20$core..fmt..LowerHex$u20$for$u20$u32$GT$3fmt17hb8cbf9f24d2b5cdeE'],
        '_ZN4core3fmt5float50_$LT$impl$u20$core..fmt..Debug$u20$for$u20$f32$GT$3fmt17h2c9ddb84ca382b3aE': exports8['_ZN4core3fmt5float50_$LT$impl$u20$core..fmt..Debug$u20$for$u20$f32$GT$3fmt17h2c9ddb84ca382b3aE'],
        '_ZN4core3fmt5float50_$LT$impl$u20$core..fmt..Debug$u20$for$u20$f64$GT$3fmt17hed9dd6c175d7379cE': exports8['_ZN4core3fmt5float50_$LT$impl$u20$core..fmt..Debug$u20$for$u20$f64$GT$3fmt17hed9dd6c175d7379cE'],
        _ZN4core3num7flt2dec8strategy5grisu12CACHED_POW1017h245f4845a56781b7E: exports8._ZN4core3num7flt2dec8strategy5grisu12CACHED_POW1017h245f4845a56781b7E,
        _ZN4core7unicode12unicode_data11white_space14WHITESPACE_MAP17hdb30b7a7fa132b9eE: exports8._ZN4core7unicode12unicode_data11white_space14WHITESPACE_MAP17hdb30b7a7fa132b9eE,
        _ZN4core7unicode12unicode_data9lowercase14BITSET_MAPPING17h7b5959b5b3a91b3cE: exports8._ZN4core7unicode12unicode_data9lowercase14BITSET_MAPPING17h7b5959b5b3a91b3cE,
        _ZN4core7unicode12unicode_data9lowercase16BITSET_CANONICAL17hf093b885c4cc2c6cE: exports8._ZN4core7unicode12unicode_data9lowercase16BITSET_CANONICAL17hf093b885c4cc2c6cE,
        _ZN4core7unicode12unicode_data9lowercase17BITSET_CHUNKS_MAP17hc4a0f1107853b0bbE: exports8._ZN4core7unicode12unicode_data9lowercase17BITSET_CHUNKS_MAP17hc4a0f1107853b0bbE,
        _ZN4core7unicode12unicode_data9lowercase19BITSET_INDEX_CHUNKS17ha2af8d4cb9f50aa2E: exports8._ZN4core7unicode12unicode_data9lowercase19BITSET_INDEX_CHUNKS17ha2af8d4cb9f50aa2E,
        _ZN4core7unicode12unicode_data9uppercase14BITSET_MAPPING17h7b240eae70249a98E: exports8._ZN4core7unicode12unicode_data9uppercase14BITSET_MAPPING17h7b240eae70249a98E,
        _ZN4core7unicode12unicode_data9uppercase16BITSET_CANONICAL17hb64b329ca8154c50E: exports8._ZN4core7unicode12unicode_data9uppercase16BITSET_CANONICAL17hb64b329ca8154c50E,
        _ZN4core7unicode12unicode_data9uppercase17BITSET_CHUNKS_MAP17hb72af7ce6470de5cE: exports8._ZN4core7unicode12unicode_data9uppercase17BITSET_CHUNKS_MAP17hb72af7ce6470de5cE,
        _ZN4core7unicode12unicode_data9uppercase19BITSET_INDEX_CHUNKS17h3f86610b88827841E: exports8._ZN4core7unicode12unicode_data9uppercase19BITSET_INDEX_CHUNKS17h3f86610b88827841E,
        '_ZN53_$LT$pyo3..err..PyErr$u20$as$u20$core..fmt..Debug$GT$3fmt17h64fedec6dc930c40E': exports8['_ZN53_$LT$pyo3..err..PyErr$u20$as$u20$core..fmt..Debug$GT$3fmt17h64fedec6dc930c40E'],
        '_ZN54_$LT$std..fs..FileType$u20$as$u20$core..fmt..Debug$GT$3fmt17h0b71358c6ea0a427E': exports8['_ZN54_$LT$std..fs..FileType$u20$as$u20$core..fmt..Debug$GT$3fmt17h0b71358c6ea0a427E'],
        '_ZN55_$LT$pyo3..err..PyErr$u20$as$u20$core..fmt..Display$GT$3fmt17h39de8fc040b1bfb6E': exports8['_ZN55_$LT$pyo3..err..PyErr$u20$as$u20$core..fmt..Display$GT$3fmt17h39de8fc040b1bfb6E'],
        '_ZN55_$LT$std..path..PathBuf$u20$as$u20$core..fmt..Debug$GT$3fmt17hd1632f9d39d1d0b7E': exports8['_ZN55_$LT$std..path..PathBuf$u20$as$u20$core..fmt..Debug$GT$3fmt17hd1632f9d39d1d0b7E'],
        '_ZN56_$LT$anyhow..ensure..Buf$u20$as$u20$core..fmt..Write$GT$9write_str17hbfb639c161300f9fE': exports8['_ZN56_$LT$anyhow..ensure..Buf$u20$as$u20$core..fmt..Write$GT$9write_str17hbfb639c161300f9fE'],
        '_ZN56_$LT$std..thread..Thread$u20$as$u20$core..fmt..Debug$GT$3fmt17h12af5fb05fd2f592E': exports8['_ZN56_$LT$std..thread..Thread$u20$as$u20$core..fmt..Debug$GT$3fmt17h12af5fb05fd2f592E'],
        '_ZN57_$LT$core..fmt..Arguments$u20$as$u20$core..fmt..Debug$GT$3fmt17hfa7359c813b232f0E': exports8['_ZN57_$LT$core..fmt..Arguments$u20$as$u20$core..fmt..Debug$GT$3fmt17hfa7359c813b232f0E'],
        '_ZN58_$LT$std..time..SystemTime$u20$as$u20$core..fmt..Debug$GT$3fmt17he6aaf759a4c2bb57E': exports8['_ZN58_$LT$std..time..SystemTime$u20$as$u20$core..fmt..Debug$GT$3fmt17he6aaf759a4c2bb57E'],
        '_ZN59_$LT$core..fmt..Arguments$u20$as$u20$core..fmt..Display$GT$3fmt17hcd9d65354d409438E': exports8['_ZN59_$LT$core..fmt..Arguments$u20$as$u20$core..fmt..Display$GT$3fmt17hcd9d65354d409438E'],
        '_ZN60_$LT$core..str..lossy..Debug$u20$as$u20$core..fmt..Debug$GT$3fmt17h457f0a13df6fe1e4E': exports8['_ZN60_$LT$core..str..lossy..Debug$u20$as$u20$core..fmt..Debug$GT$3fmt17h457f0a13df6fe1e4E'],
        '_ZN60_$LT$std..io..error..Error$u20$as$u20$core..fmt..Display$GT$3fmt17ha0b3dbf84ae8b585E': exports8['_ZN60_$LT$std..io..error..Error$u20$as$u20$core..fmt..Display$GT$3fmt17ha0b3dbf84ae8b585E'],
        '_ZN62_$LT$core..cell..BorrowError$u20$as$u20$core..fmt..Display$GT$3fmt17hea55305ea50d64aeE': exports8['_ZN62_$LT$core..cell..BorrowError$u20$as$u20$core..fmt..Display$GT$3fmt17hea55305ea50d64aeE'],
        '_ZN63_$LT$std..ffi..os_str..OsString$u20$as$u20$core..fmt..Debug$GT$3fmt17h349bdb00fa90c00bE': exports8['_ZN63_$LT$std..ffi..os_str..OsString$u20$as$u20$core..fmt..Debug$GT$3fmt17h349bdb00fa90c00bE'],
        '_ZN63_$LT$std..sys..env..common..Env$u20$as$u20$core..fmt..Debug$GT$3fmt17h04c11edbc0d5abfcE': exports8['_ZN63_$LT$std..sys..env..common..Env$u20$as$u20$core..fmt..Debug$GT$3fmt17h04c11edbc0d5abfcE'],
        '_ZN63_$LT$wasi..lib_generated..Errno$u20$as$u20$core..fmt..Debug$GT$3fmt17hca6bc30c5a796c08E': exports8['_ZN63_$LT$wasi..lib_generated..Errno$u20$as$u20$core..fmt..Debug$GT$3fmt17hca6bc30c5a796c08E'],
        '_ZN64_$LT$anyhow..wrapper..BoxedError$u20$as$u20$core..fmt..Debug$GT$3fmt17hd10ff17c329b6768E': exports8['_ZN64_$LT$anyhow..wrapper..BoxedError$u20$as$u20$core..fmt..Debug$GT$3fmt17hd10ff17c329b6768E'],
        '_ZN65_$LT$core..ascii..EscapeDefault$u20$as$u20$core..fmt..Display$GT$3fmt17h55d5f08e4c539a87E': exports8['_ZN65_$LT$core..ascii..EscapeDefault$u20$as$u20$core..fmt..Display$GT$3fmt17h55d5f08e4c539a87E'],
        '_ZN65_$LT$core..cell..BorrowMutError$u20$as$u20$core..fmt..Display$GT$3fmt17h5a09dddf1eff90b9E': exports8['_ZN65_$LT$core..cell..BorrowMutError$u20$as$u20$core..fmt..Display$GT$3fmt17h5a09dddf1eff90b9E'],
        '_ZN65_$LT$std..sys..args..common..Args$u20$as$u20$core..fmt..Debug$GT$3fmt17h438b2b6ab0f3bd65E': exports8['_ZN65_$LT$std..sys..args..common..Args$u20$as$u20$core..fmt..Debug$GT$3fmt17h438b2b6ab0f3bd65E'],
        '_ZN66_$LT$anyhow..wrapper..BoxedError$u20$as$u20$core..error..Error$GT$6source17h8d75067b1fcf1ec0E': exports8['_ZN66_$LT$anyhow..wrapper..BoxedError$u20$as$u20$core..error..Error$GT$6source17h8d75067b1fcf1ec0E'],
        '_ZN66_$LT$anyhow..wrapper..BoxedError$u20$as$u20$core..fmt..Display$GT$3fmt17h73d85f8383aa3946E': exports8['_ZN66_$LT$anyhow..wrapper..BoxedError$u20$as$u20$core..fmt..Display$GT$3fmt17h73d85f8383aa3946E'],
        '_ZN66_$LT$std..sys..stdio..wasip1..Stderr$u20$as$u20$std..io..Write$GT$14write_vectored17he4b60357cc01ca13E': exports8['_ZN66_$LT$std..sys..stdio..wasip1..Stderr$u20$as$u20$std..io..Write$GT$14write_vectored17he4b60357cc01ca13E'],
        '_ZN66_$LT$std..sys..stdio..wasip1..Stderr$u20$as$u20$std..io..Write$GT$5write17h23747af9172e696bE': exports8['_ZN66_$LT$std..sys..stdio..wasip1..Stderr$u20$as$u20$std..io..Write$GT$5write17h23747af9172e696bE'],
        '_ZN67_$LT$core..net..ip_addr..Ipv4Addr$u20$as$u20$core..fmt..Display$GT$3fmt17hda761ebf91591477E': exports8['_ZN67_$LT$core..net..ip_addr..Ipv4Addr$u20$as$u20$core..fmt..Display$GT$3fmt17hda761ebf91591477E'],
        '_ZN68_$LT$core..fmt..builders..PadAdapter$u20$as$u20$core..fmt..Write$GT$10write_char17h04e391e537672539E': exports8['_ZN68_$LT$core..fmt..builders..PadAdapter$u20$as$u20$core..fmt..Write$GT$10write_char17h04e391e537672539E'],
        '_ZN68_$LT$core..fmt..builders..PadAdapter$u20$as$u20$core..fmt..Write$GT$9write_str17h82c8961efb9880d9E': exports8['_ZN68_$LT$core..fmt..builders..PadAdapter$u20$as$u20$core..fmt..Write$GT$9write_str17h82c8961efb9880d9E'],
        '_ZN68_$LT$std..thread..local..AccessError$u20$as$u20$core..fmt..Debug$GT$3fmt17ha64982c736394091E': exports8['_ZN68_$LT$std..thread..local..AccessError$u20$as$u20$core..fmt..Debug$GT$3fmt17ha64982c736394091E'],
        '_ZN6anyhow5error60_$LT$impl$u20$core..fmt..Debug$u20$for$u20$anyhow..Error$GT$3fmt17h2440aed05d75103dE': exports8['_ZN6anyhow5error60_$LT$impl$u20$core..fmt..Debug$u20$for$u20$anyhow..Error$GT$3fmt17h2440aed05d75103dE'],
        '_ZN70_$LT$core..slice..ascii..EscapeAscii$u20$as$u20$core..fmt..Display$GT$3fmt17ha8bf817867d8d134E': exports8['_ZN70_$LT$core..slice..ascii..EscapeAscii$u20$as$u20$core..fmt..Display$GT$3fmt17ha8bf817867d8d134E'],
        '_ZN71_$LT$std..sys..env..common..EnvStrDebug$u20$as$u20$core..fmt..Debug$GT$3fmt17hfb687a88b15c608fE': exports8['_ZN71_$LT$std..sys..env..common..EnvStrDebug$u20$as$u20$core..fmt..Debug$GT$3fmt17hfb687a88b15c608fE'],
        '_ZN71_$LT$std..sys..process..env..CommandEnv$u20$as$u20$core..fmt..Debug$GT$3fmt17h56f8aca3164211d4E': exports8['_ZN71_$LT$std..sys..process..env..CommandEnv$u20$as$u20$core..fmt..Debug$GT$3fmt17h56f8aca3164211d4E'],
        '_ZN74_$LT$core..num..niche_types..I32NotAllOnes$u20$as$u20$core..fmt..Debug$GT$3fmt17hd09cfd369d1a644dE': exports8['_ZN74_$LT$core..num..niche_types..I32NotAllOnes$u20$as$u20$core..fmt..Debug$GT$3fmt17hd09cfd369d1a644dE'],
        '_ZN79_$LT$std..backtrace_rs..symbolize..SymbolName$u20$as$u20$core..fmt..Display$GT$3fmt17h32f95b95f6790ecbE': exports8['_ZN79_$LT$std..backtrace_rs..symbolize..SymbolName$u20$as$u20$core..fmt..Display$GT$3fmt17h32f95b95f6790ecbE'],
        '_ZN79_$LT$std..panicking..resume_unwind..RewrapBox$u20$as$u20$core..fmt..Display$GT$3fmt17h3710458dd95fff58E': exports8['_ZN79_$LT$std..panicking..resume_unwind..RewrapBox$u20$as$u20$core..fmt..Display$GT$3fmt17h3710458dd95fff58E'],
        '_ZN86_$LT$std..panicking..panic_handler..StaticStrPayload$u20$as$u20$core..fmt..Display$GT$3fmt17h314e5f0c96f156e3E': exports8['_ZN86_$LT$std..panicking..panic_handler..StaticStrPayload$u20$as$u20$core..fmt..Display$GT$3fmt17h314e5f0c96f156e3E'],
        '_ZN86_$LT$std..panicking..resume_unwind..RewrapBox$u20$as$u20$core..panic..PanicPayload$GT$8take_box17h2a26318c64b8bc8dE': exports8['_ZN86_$LT$std..panicking..resume_unwind..RewrapBox$u20$as$u20$core..panic..PanicPayload$GT$8take_box17h2a26318c64b8bc8dE'],
        '_ZN89_$LT$std..panicking..panic_handler..FormatStringPayload$u20$as$u20$core..fmt..Display$GT$3fmt17h378dc741c1728fb4E': exports8['_ZN89_$LT$std..panicking..panic_handler..FormatStringPayload$u20$as$u20$core..fmt..Display$GT$3fmt17h378dc741c1728fb4E'],
        '_ZN93_$LT$std..panicking..panic_handler..StaticStrPayload$u20$as$u20$core..panic..PanicPayload$GT$8take_box17hf6db74db4016422eE': exports8['_ZN93_$LT$std..panicking..panic_handler..StaticStrPayload$u20$as$u20$core..panic..PanicPayload$GT$8take_box17hf6db74db4016422eE'],
        '_ZN96_$LT$std..panicking..panic_handler..FormatStringPayload$u20$as$u20$core..panic..PanicPayload$GT$3get17h58c1501ce8c6278dE': exports8['_ZN96_$LT$std..panicking..panic_handler..FormatStringPayload$u20$as$u20$core..panic..PanicPayload$GT$3get17h58c1501ce8c6278dE'],
        '_ZN96_$LT$std..panicking..panic_handler..FormatStringPayload$u20$as$u20$core..panic..PanicPayload$GT$8take_box17h523b78cd8cc1228eE': exports8['_ZN96_$LT$std..panicking..panic_handler..FormatStringPayload$u20$as$u20$core..panic..PanicPayload$GT$8take_box17h523b78cd8cc1228eE'],
        '_ZN98_$LT$std..sys..backtrace..BacktraceLock..print..DisplayBacktrace$u20$as$u20$core..fmt..Display$GT$3fmt17h13ad9e9b3e2437e0E': exports8['_ZN98_$LT$std..sys..backtrace..BacktraceLock..print..DisplayBacktrace$u20$as$u20$core..fmt..Display$GT$3fmt17h13ad9e9b3e2437e0E'],
        __wasm_apply_data_relocs: exports8.__wasm_apply_data_relocs,
        _initialize: exports8._initialize,
        cabi_realloc: exports8.cabi_realloc,
      },
      'libdl.so': {
        __wasm_apply_data_relocs: exports15.__wasm_apply_data_relocs,
        __wasm_set_libraries: exports15.__wasm_set_libraries,
        _initialize: exports15._initialize,
        dlerror: exports15.dlerror,
        dlopen: exports15.dlopen,
        dlsym: exports15.dlsym,
      },
      'libpython3.14.so': {
        PY_TIMEOUT_MAX: exports9.PY_TIMEOUT_MAX,
        PyAsyncGen_Type: exports9.PyAsyncGen_Type,
        PyBaseObject_Type: exports9.PyBaseObject_Type,
        PyBool_Type: exports9.PyBool_Type,
        PyBuffer_Release: exports9.PyBuffer_Release,
        PyByteArrayIter_Type: exports9.PyByteArrayIter_Type,
        PyByteArray_AsString: exports9.PyByteArray_AsString,
        PyByteArray_Concat: exports9.PyByteArray_Concat,
        PyByteArray_FromObject: exports9.PyByteArray_FromObject,
        PyByteArray_FromStringAndSize: exports9.PyByteArray_FromStringAndSize,
        PyByteArray_Resize: exports9.PyByteArray_Resize,
        PyByteArray_Size: exports9.PyByteArray_Size,
        PyByteArray_Type: exports9.PyByteArray_Type,
        PyBytesIter_Type: exports9.PyBytesIter_Type,
        PyBytes_AsString: exports9.PyBytes_AsString,
        PyBytes_FromStringAndSize: exports9.PyBytes_FromStringAndSize,
        PyBytes_Size: exports9.PyBytes_Size,
        PyBytes_Type: exports9.PyBytes_Type,
        PyCFunction_Type: exports9.PyCFunction_Type,
        PyCMethod_New: exports9.PyCMethod_New,
        PyCMethod_Type: exports9.PyCMethod_Type,
        PyCallIter_Type: exports9.PyCallIter_Type,
        PyCallable_Check: exports9.PyCallable_Check,
        PyCapsule_GetContext: exports9.PyCapsule_GetContext,
        PyCapsule_GetName: exports9.PyCapsule_GetName,
        PyCapsule_GetPointer: exports9.PyCapsule_GetPointer,
        PyCapsule_IsValid: exports9.PyCapsule_IsValid,
        PyCapsule_SetContext: exports9.PyCapsule_SetContext,
        PyCapsule_Type: exports9.PyCapsule_Type,
        PyCell_Type: exports9.PyCell_Type,
        PyClassMethodDescr_Type: exports9.PyClassMethodDescr_Type,
        PyClassMethod_Type: exports9.PyClassMethod_Type,
        PyCode_Type: exports9.PyCode_Type,
        PyComplex_FromDoubles: exports9.PyComplex_FromDoubles,
        PyComplex_ImagAsDouble: exports9.PyComplex_ImagAsDouble,
        PyComplex_RealAsDouble: exports9.PyComplex_RealAsDouble,
        PyComplex_Type: exports9.PyComplex_Type,
        PyContextToken_Type: exports9.PyContextToken_Type,
        PyContextVar_Type: exports9.PyContextVar_Type,
        PyContext_Type: exports9.PyContext_Type,
        PyCoro_Type: exports9.PyCoro_Type,
        PyDictItems_Type: exports9.PyDictItems_Type,
        PyDictIterItem_Type: exports9.PyDictIterItem_Type,
        PyDictIterKey_Type: exports9.PyDictIterKey_Type,
        PyDictIterValue_Type: exports9.PyDictIterValue_Type,
        PyDictKeys_Type: exports9.PyDictKeys_Type,
        PyDictProxy_New: exports9.PyDictProxy_New,
        PyDictProxy_Type: exports9.PyDictProxy_Type,
        PyDictRevIterItem_Type: exports9.PyDictRevIterItem_Type,
        PyDictRevIterKey_Type: exports9.PyDictRevIterKey_Type,
        PyDictRevIterValue_Type: exports9.PyDictRevIterValue_Type,
        PyDictValues_Type: exports9.PyDictValues_Type,
        PyDict_Clear: exports9.PyDict_Clear,
        PyDict_Contains: exports9.PyDict_Contains,
        PyDict_Copy: exports9.PyDict_Copy,
        PyDict_DelItem: exports9.PyDict_DelItem,
        PyDict_GetItemWithError: exports9.PyDict_GetItemWithError,
        PyDict_Items: exports9.PyDict_Items,
        PyDict_Keys: exports9.PyDict_Keys,
        PyDict_Merge: exports9.PyDict_Merge,
        PyDict_MergeFromSeq2: exports9.PyDict_MergeFromSeq2,
        PyDict_New: exports9.PyDict_New,
        PyDict_SetItem: exports9.PyDict_SetItem,
        PyDict_Size: exports9.PyDict_Size,
        PyDict_Type: exports9.PyDict_Type,
        PyDict_Update: exports9.PyDict_Update,
        PyDict_Values: exports9.PyDict_Values,
        PyEllipsis_Type: exports9.PyEllipsis_Type,
        PyEnum_Type: exports9.PyEnum_Type,
        PyErr_CheckSignals: exports9.PyErr_CheckSignals,
        PyErr_Clear: exports9.PyErr_Clear,
        PyErr_DisplayException: exports9.PyErr_DisplayException,
        PyErr_GetRaisedException: exports9.PyErr_GetRaisedException,
        PyErr_GivenExceptionMatches: exports9.PyErr_GivenExceptionMatches,
        PyErr_NewExceptionWithDoc: exports9.PyErr_NewExceptionWithDoc,
        PyErr_Occurred: exports9.PyErr_Occurred,
        PyErr_Print: exports9.PyErr_Print,
        PyErr_PrintEx: exports9.PyErr_PrintEx,
        PyErr_SetObject: exports9.PyErr_SetObject,
        PyErr_SetRaisedException: exports9.PyErr_SetRaisedException,
        PyErr_SetString: exports9.PyErr_SetString,
        PyErr_WarnEx: exports9.PyErr_WarnEx,
        PyErr_WarnExplicit: exports9.PyErr_WarnExplicit,
        PyErr_WriteUnraisable: exports9.PyErr_WriteUnraisable,
        PyEval_EvalCode: exports9.PyEval_EvalCode,
        PyEval_GetBuiltins: exports9.PyEval_GetBuiltins,
        PyEval_RestoreThread: exports9.PyEval_RestoreThread,
        PyEval_SaveThread: exports9.PyEval_SaveThread,
        PyExc_ArithmeticError: exports9.PyExc_ArithmeticError,
        PyExc_AssertionError: exports9.PyExc_AssertionError,
        PyExc_AttributeError: exports9.PyExc_AttributeError,
        PyExc_BaseException: exports9.PyExc_BaseException,
        PyExc_BaseExceptionGroup: exports9.PyExc_BaseExceptionGroup,
        PyExc_BlockingIOError: exports9.PyExc_BlockingIOError,
        PyExc_BrokenPipeError: exports9.PyExc_BrokenPipeError,
        PyExc_BufferError: exports9.PyExc_BufferError,
        PyExc_BytesWarning: exports9.PyExc_BytesWarning,
        PyExc_ChildProcessError: exports9.PyExc_ChildProcessError,
        PyExc_ConnectionAbortedError: exports9.PyExc_ConnectionAbortedError,
        PyExc_ConnectionRefusedError: exports9.PyExc_ConnectionRefusedError,
        PyExc_ConnectionResetError: exports9.PyExc_ConnectionResetError,
        PyExc_DeprecationWarning: exports9.PyExc_DeprecationWarning,
        PyExc_EOFError: exports9.PyExc_EOFError,
        PyExc_EncodingWarning: exports9.PyExc_EncodingWarning,
        PyExc_EnvironmentError: exports9.PyExc_EnvironmentError,
        PyExc_Exception: exports9.PyExc_Exception,
        PyExc_FileExistsError: exports9.PyExc_FileExistsError,
        PyExc_FileNotFoundError: exports9.PyExc_FileNotFoundError,
        PyExc_GeneratorExit: exports9.PyExc_GeneratorExit,
        PyExc_IOError: exports9.PyExc_IOError,
        PyExc_ImportError: exports9.PyExc_ImportError,
        PyExc_ImportWarning: exports9.PyExc_ImportWarning,
        PyExc_IndentationError: exports9.PyExc_IndentationError,
        PyExc_IndexError: exports9.PyExc_IndexError,
        PyExc_InterpreterError: exports9.PyExc_InterpreterError,
        PyExc_InterpreterNotFoundError: exports9.PyExc_InterpreterNotFoundError,
        PyExc_InterruptedError: exports9.PyExc_InterruptedError,
        PyExc_IsADirectoryError: exports9.PyExc_IsADirectoryError,
        PyExc_KeyError: exports9.PyExc_KeyError,
        PyExc_KeyboardInterrupt: exports9.PyExc_KeyboardInterrupt,
        PyExc_LookupError: exports9.PyExc_LookupError,
        PyExc_MemoryError: exports9.PyExc_MemoryError,
        PyExc_ModuleNotFoundError: exports9.PyExc_ModuleNotFoundError,
        PyExc_NameError: exports9.PyExc_NameError,
        PyExc_NotADirectoryError: exports9.PyExc_NotADirectoryError,
        PyExc_NotImplementedError: exports9.PyExc_NotImplementedError,
        PyExc_OSError: exports9.PyExc_OSError,
        PyExc_OverflowError: exports9.PyExc_OverflowError,
        PyExc_PendingDeprecationWarning: exports9.PyExc_PendingDeprecationWarning,
        PyExc_PermissionError: exports9.PyExc_PermissionError,
        PyExc_ProcessLookupError: exports9.PyExc_ProcessLookupError,
        PyExc_PythonFinalizationError: exports9.PyExc_PythonFinalizationError,
        PyExc_RecursionError: exports9.PyExc_RecursionError,
        PyExc_ReferenceError: exports9.PyExc_ReferenceError,
        PyExc_ResourceWarning: exports9.PyExc_ResourceWarning,
        PyExc_RuntimeError: exports9.PyExc_RuntimeError,
        PyExc_RuntimeWarning: exports9.PyExc_RuntimeWarning,
        PyExc_StopAsyncIteration: exports9.PyExc_StopAsyncIteration,
        PyExc_StopIteration: exports9.PyExc_StopIteration,
        PyExc_SyntaxError: exports9.PyExc_SyntaxError,
        PyExc_SyntaxWarning: exports9.PyExc_SyntaxWarning,
        PyExc_SystemError: exports9.PyExc_SystemError,
        PyExc_SystemExit: exports9.PyExc_SystemExit,
        PyExc_TabError: exports9.PyExc_TabError,
        PyExc_TimeoutError: exports9.PyExc_TimeoutError,
        PyExc_TypeError: exports9.PyExc_TypeError,
        PyExc_UnboundLocalError: exports9.PyExc_UnboundLocalError,
        PyExc_UnicodeDecodeError: exports9.PyExc_UnicodeDecodeError,
        PyExc_UnicodeEncodeError: exports9.PyExc_UnicodeEncodeError,
        PyExc_UnicodeError: exports9.PyExc_UnicodeError,
        PyExc_UnicodeTranslateError: exports9.PyExc_UnicodeTranslateError,
        PyExc_UserWarning: exports9.PyExc_UserWarning,
        PyExc_ValueError: exports9.PyExc_ValueError,
        PyExc_Warning: exports9.PyExc_Warning,
        PyExc_ZeroDivisionError: exports9.PyExc_ZeroDivisionError,
        PyException_GetCause: exports9.PyException_GetCause,
        PyException_GetTraceback: exports9.PyException_GetTraceback,
        PyException_SetCause: exports9.PyException_SetCause,
        PyException_SetTraceback: exports9.PyException_SetTraceback,
        PyFilter_Type: exports9.PyFilter_Type,
        PyFloat_AsDouble: exports9.PyFloat_AsDouble,
        PyFloat_FromDouble: exports9.PyFloat_FromDouble,
        PyFloat_Type: exports9.PyFloat_Type,
        PyFrameLocalsProxy_Type: exports9.PyFrameLocalsProxy_Type,
        PyFrame_Type: exports9.PyFrame_Type,
        PyFrozenSet_New: exports9.PyFrozenSet_New,
        PyFrozenSet_Type: exports9.PyFrozenSet_Type,
        PyFunction_Type: exports9.PyFunction_Type,
        PyGILState_Ensure: exports9.PyGILState_Ensure,
        PyGILState_Release: exports9.PyGILState_Release,
        PyGen_Type: exports9.PyGen_Type,
        PyGetSetDescr_Type: exports9.PyGetSetDescr_Type,
        PyImport_AddModule: exports9.PyImport_AddModule,
        PyImport_AppendInittab: exports9.PyImport_AppendInittab,
        PyImport_ExecCodeModuleEx: exports9.PyImport_ExecCodeModuleEx,
        PyImport_FrozenModules: exports9.PyImport_FrozenModules,
        PyImport_Import: exports9.PyImport_Import,
        PyImport_Inittab: exports9.PyImport_Inittab,
        PyInit__abc: exports9.PyInit__abc,
        PyInit__ast: exports9.PyInit__ast,
        PyInit__asyncio: exports9.PyInit__asyncio,
        PyInit__bisect: exports9.PyInit__bisect,
        PyInit__blake2: exports9.PyInit__blake2,
        PyInit__codecs: exports9.PyInit__codecs,
        PyInit__codecs_cn: exports9.PyInit__codecs_cn,
        PyInit__codecs_hk: exports9.PyInit__codecs_hk,
        PyInit__codecs_iso2022: exports9.PyInit__codecs_iso2022,
        PyInit__codecs_jp: exports9.PyInit__codecs_jp,
        PyInit__codecs_kr: exports9.PyInit__codecs_kr,
        PyInit__codecs_tw: exports9.PyInit__codecs_tw,
        PyInit__collections: exports9.PyInit__collections,
        PyInit__contextvars: exports9.PyInit__contextvars,
        PyInit__csv: exports9.PyInit__csv,
        PyInit__datetime: exports9.PyInit__datetime,
        PyInit__decimal: exports9.PyInit__decimal,
        PyInit__elementtree: exports9.PyInit__elementtree,
        PyInit__functools: exports9.PyInit__functools,
        PyInit__heapq: exports9.PyInit__heapq,
        PyInit__hmac: exports9.PyInit__hmac,
        PyInit__imp: exports9.PyInit__imp,
        PyInit__io: exports9.PyInit__io,
        PyInit__json: exports9.PyInit__json,
        PyInit__locale: exports9.PyInit__locale,
        PyInit__lsprof: exports9.PyInit__lsprof,
        PyInit__md5: exports9.PyInit__md5,
        PyInit__multibytecodec: exports9.PyInit__multibytecodec,
        PyInit__opcode: exports9.PyInit__opcode,
        PyInit__operator: exports9.PyInit__operator,
        PyInit__pickle: exports9.PyInit__pickle,
        PyInit__queue: exports9.PyInit__queue,
        PyInit__random: exports9.PyInit__random,
        PyInit__sha1: exports9.PyInit__sha1,
        PyInit__sha2: exports9.PyInit__sha2,
        PyInit__sha3: exports9.PyInit__sha3,
        PyInit__signal: exports9.PyInit__signal,
        PyInit__socket: exports9.PyInit__socket,
        PyInit__sre: exports9.PyInit__sre,
        PyInit__stat: exports9.PyInit__stat,
        PyInit__statistics: exports9.PyInit__statistics,
        PyInit__string: exports9.PyInit__string,
        PyInit__struct: exports9.PyInit__struct,
        PyInit__suggestions: exports9.PyInit__suggestions,
        PyInit__symtable: exports9.PyInit__symtable,
        PyInit__sysconfig: exports9.PyInit__sysconfig,
        PyInit__thread: exports9.PyInit__thread,
        PyInit__tokenize: exports9.PyInit__tokenize,
        PyInit__tracemalloc: exports9.PyInit__tracemalloc,
        PyInit__types: exports9.PyInit__types,
        PyInit__typing: exports9.PyInit__typing,
        PyInit__weakref: exports9.PyInit__weakref,
        PyInit__zoneinfo: exports9.PyInit__zoneinfo,
        PyInit_array: exports9.PyInit_array,
        PyInit_atexit: exports9.PyInit_atexit,
        PyInit_binascii: exports9.PyInit_binascii,
        PyInit_cmath: exports9.PyInit_cmath,
        PyInit_errno: exports9.PyInit_errno,
        PyInit_faulthandler: exports9.PyInit_faulthandler,
        PyInit_gc: exports9.PyInit_gc,
        PyInit_itertools: exports9.PyInit_itertools,
        PyInit_math: exports9.PyInit_math,
        PyInit_posix: exports9.PyInit_posix,
        PyInit_pyexpat: exports9.PyInit_pyexpat,
        PyInit_select: exports9.PyInit_select,
        PyInit_time: exports9.PyInit_time,
        PyInit_unicodedata: exports9.PyInit_unicodedata,
        PyInit_zlib: exports9.PyInit_zlib,
        PyInstanceMethod_Type: exports9.PyInstanceMethod_Type,
        PyInterpreterState_Get: exports9.PyInterpreterState_Get,
        PyInterpreterState_GetID: exports9.PyInterpreterState_GetID,
        PyIter_Check: exports9.PyIter_Check,
        PyIter_Next: exports9.PyIter_Next,
        PyListIter_Type: exports9.PyListIter_Type,
        PyListRevIter_Type: exports9.PyListRevIter_Type,
        PyList_Append: exports9.PyList_Append,
        PyList_AsTuple: exports9.PyList_AsTuple,
        PyList_GetItem: exports9.PyList_GetItem,
        PyList_GetSlice: exports9.PyList_GetSlice,
        PyList_Insert: exports9.PyList_Insert,
        PyList_New: exports9.PyList_New,
        PyList_Reverse: exports9.PyList_Reverse,
        PyList_SetItem: exports9.PyList_SetItem,
        PyList_Size: exports9.PyList_Size,
        PyList_Sort: exports9.PyList_Sort,
        PyList_Type: exports9.PyList_Type,
        PyLongRangeIter_Type: exports9.PyLongRangeIter_Type,
        PyLong_AsLong: exports9.PyLong_AsLong,
        PyLong_AsLongLong: exports9.PyLong_AsLongLong,
        PyLong_AsUnsignedLongLong: exports9.PyLong_AsUnsignedLongLong,
        PyLong_AsUnsignedLongLongMask: exports9.PyLong_AsUnsignedLongLongMask,
        PyLong_FromLong: exports9.PyLong_FromLong,
        PyLong_FromLongLong: exports9.PyLong_FromLongLong,
        PyLong_FromSsize_t: exports9.PyLong_FromSsize_t,
        PyLong_FromUnsignedLongLong: exports9.PyLong_FromUnsignedLongLong,
        PyLong_Type: exports9.PyLong_Type,
        PyMap_Type: exports9.PyMap_Type,
        PyMapping_Keys: exports9.PyMapping_Keys,
        PyMarshal_Init: exports9.PyMarshal_Init,
        PyMem_Free: exports9.PyMem_Free,
        PyMem_Malloc: exports9.PyMem_Malloc,
        PyMem_RawFree: exports9.PyMem_RawFree,
        PyMem_RawMalloc: exports9.PyMem_RawMalloc,
        PyMem_Realloc: exports9.PyMem_Realloc,
        PyMemberDescr_Type: exports9.PyMemberDescr_Type,
        PyMemoryView_FromObject: exports9.PyMemoryView_FromObject,
        PyMemoryView_Type: exports9.PyMemoryView_Type,
        PyMethodDescr_Type: exports9.PyMethodDescr_Type,
        PyMethod_Type: exports9.PyMethod_Type,
        PyModuleDef_Type: exports9.PyModuleDef_Type,
        PyModule_Create2: exports9.PyModule_Create2,
        PyModule_GetDict: exports9.PyModule_GetDict,
        PyModule_GetFilenameObject: exports9.PyModule_GetFilenameObject,
        PyModule_GetNameObject: exports9.PyModule_GetNameObject,
        PyModule_NewObject: exports9.PyModule_NewObject,
        PyModule_Type: exports9.PyModule_Type,
        PyNumber_Absolute: exports9.PyNumber_Absolute,
        PyNumber_Add: exports9.PyNumber_Add,
        PyNumber_And: exports9.PyNumber_And,
        PyNumber_Divmod: exports9.PyNumber_Divmod,
        PyNumber_FloorDivide: exports9.PyNumber_FloorDivide,
        PyNumber_InPlaceAdd: exports9.PyNumber_InPlaceAdd,
        PyNumber_InPlaceAnd: exports9.PyNumber_InPlaceAnd,
        PyNumber_InPlaceFloorDivide: exports9.PyNumber_InPlaceFloorDivide,
        PyNumber_InPlaceLshift: exports9.PyNumber_InPlaceLshift,
        PyNumber_InPlaceMatrixMultiply: exports9.PyNumber_InPlaceMatrixMultiply,
        PyNumber_InPlaceMultiply: exports9.PyNumber_InPlaceMultiply,
        PyNumber_InPlaceOr: exports9.PyNumber_InPlaceOr,
        PyNumber_InPlaceRemainder: exports9.PyNumber_InPlaceRemainder,
        PyNumber_InPlaceRshift: exports9.PyNumber_InPlaceRshift,
        PyNumber_InPlaceSubtract: exports9.PyNumber_InPlaceSubtract,
        PyNumber_InPlaceTrueDivide: exports9.PyNumber_InPlaceTrueDivide,
        PyNumber_InPlaceXor: exports9.PyNumber_InPlaceXor,
        PyNumber_Index: exports9.PyNumber_Index,
        PyNumber_Invert: exports9.PyNumber_Invert,
        PyNumber_Lshift: exports9.PyNumber_Lshift,
        PyNumber_MatrixMultiply: exports9.PyNumber_MatrixMultiply,
        PyNumber_Multiply: exports9.PyNumber_Multiply,
        PyNumber_Negative: exports9.PyNumber_Negative,
        PyNumber_Or: exports9.PyNumber_Or,
        PyNumber_Positive: exports9.PyNumber_Positive,
        PyNumber_Power: exports9.PyNumber_Power,
        PyNumber_Remainder: exports9.PyNumber_Remainder,
        PyNumber_Rshift: exports9.PyNumber_Rshift,
        PyNumber_Subtract: exports9.PyNumber_Subtract,
        PyNumber_TrueDivide: exports9.PyNumber_TrueDivide,
        PyNumber_Xor: exports9.PyNumber_Xor,
        PyODictItems_Type: exports9.PyODictItems_Type,
        PyODictIter_Type: exports9.PyODictIter_Type,
        PyODictKeys_Type: exports9.PyODictKeys_Type,
        PyODictValues_Type: exports9.PyODictValues_Type,
        PyODict_Type: exports9.PyODict_Type,
        PyOS_FSPath: exports9.PyOS_FSPath,
        PyOS_InputHook: exports9.PyOS_InputHook,
        PyOS_ReadlineFunctionPointer: exports9.PyOS_ReadlineFunctionPointer,
        PyObject_ASCII: exports9.PyObject_ASCII,
        PyObject_Call: exports9.PyObject_Call,
        PyObject_CallMethodObjArgs: exports9.PyObject_CallMethodObjArgs,
        PyObject_CallNoArgs: exports9.PyObject_CallNoArgs,
        PyObject_DelItem: exports9.PyObject_DelItem,
        PyObject_Dir: exports9.PyObject_Dir,
        PyObject_Free: exports9.PyObject_Free,
        PyObject_GC_Del: exports9.PyObject_GC_Del,
        PyObject_GenericGetAttr: exports9.PyObject_GenericGetAttr,
        PyObject_GenericGetDict: exports9.PyObject_GenericGetDict,
        PyObject_GenericHash: exports9.PyObject_GenericHash,
        PyObject_GenericSetAttr: exports9.PyObject_GenericSetAttr,
        PyObject_GenericSetDict: exports9.PyObject_GenericSetDict,
        PyObject_GetAttr: exports9.PyObject_GetAttr,
        PyObject_GetItem: exports9.PyObject_GetItem,
        PyObject_GetIter: exports9.PyObject_GetIter,
        PyObject_Hash: exports9.PyObject_Hash,
        PyObject_HashNotImplemented: exports9.PyObject_HashNotImplemented,
        PyObject_IsInstance: exports9.PyObject_IsInstance,
        PyObject_IsSubclass: exports9.PyObject_IsSubclass,
        PyObject_IsTrue: exports9.PyObject_IsTrue,
        PyObject_Repr: exports9.PyObject_Repr,
        PyObject_RichCompare: exports9.PyObject_RichCompare,
        PyObject_SelfIter: exports9.PyObject_SelfIter,
        PyObject_SetAttr: exports9.PyObject_SetAttr,
        PyObject_SetAttrString: exports9.PyObject_SetAttrString,
        PyObject_SetItem: exports9.PyObject_SetItem,
        PyObject_Size: exports9.PyObject_Size,
        PyObject_Str: exports9.PyObject_Str,
        PyObject_Vectorcall: exports9.PyObject_Vectorcall,
        PyObject_VectorcallMethod: exports9.PyObject_VectorcallMethod,
        PyPickleBuffer_Type: exports9.PyPickleBuffer_Type,
        PyProperty_Type: exports9.PyProperty_Type,
        PyRangeIter_Type: exports9.PyRangeIter_Type,
        PyRange_Type: exports9.PyRange_Type,
        PyReversed_Type: exports9.PyReversed_Type,
        PySeqIter_Type: exports9.PySeqIter_Type,
        PySequence_Check: exports9.PySequence_Check,
        PySequence_Contains: exports9.PySequence_Contains,
        PySequence_Count: exports9.PySequence_Count,
        PySequence_DelItem: exports9.PySequence_DelItem,
        PySequence_Index: exports9.PySequence_Index,
        PySequence_List: exports9.PySequence_List,
        PySequence_SetItem: exports9.PySequence_SetItem,
        PySequence_Size: exports9.PySequence_Size,
        PySetIter_Type: exports9.PySetIter_Type,
        PySet_Add: exports9.PySet_Add,
        PySet_Contains: exports9.PySet_Contains,
        PySet_Discard: exports9.PySet_Discard,
        PySet_New: exports9.PySet_New,
        PySet_Pop: exports9.PySet_Pop,
        PySet_Size: exports9.PySet_Size,
        PySet_Type: exports9.PySet_Type,
        PySlice_AdjustIndices: exports9.PySlice_AdjustIndices,
        PySlice_New: exports9.PySlice_New,
        PySlice_Type: exports9.PySlice_Type,
        PySlice_Unpack: exports9.PySlice_Unpack,
        PyStaticMethod_Type: exports9.PyStaticMethod_Type,
        PyStdPrinter_Type: exports9.PyStdPrinter_Type,
        PyStructSequence_UnnamedField: exports9.PyStructSequence_UnnamedField,
        PySuper_Type: exports9.PySuper_Type,
        PyTraceBack_Print: exports9.PyTraceBack_Print,
        PyTraceBack_Type: exports9.PyTraceBack_Type,
        PyTupleIter_Type: exports9.PyTupleIter_Type,
        PyTuple_GetItem: exports9.PyTuple_GetItem,
        PyTuple_GetSlice: exports9.PyTuple_GetSlice,
        PyTuple_New: exports9.PyTuple_New,
        PyTuple_SetItem: exports9.PyTuple_SetItem,
        PyTuple_Size: exports9.PyTuple_Size,
        PyTuple_Type: exports9.PyTuple_Type,
        PyType_FromSpec: exports9.PyType_FromSpec,
        PyType_GenericAlloc: exports9.PyType_GenericAlloc,
        PyType_GenericNew: exports9.PyType_GenericNew,
        PyType_GetFlags: exports9.PyType_GetFlags,
        PyType_GetName: exports9.PyType_GetName,
        PyType_GetQualName: exports9.PyType_GetQualName,
        PyType_GetSlot: exports9.PyType_GetSlot,
        PyType_IsSubtype: exports9.PyType_IsSubtype,
        PyType_Type: exports9.PyType_Type,
        PyUnicodeDecodeError_Create: exports9.PyUnicodeDecodeError_Create,
        PyUnicodeIter_Type: exports9.PyUnicodeIter_Type,
        PyUnicode_AsASCIIString: exports9.PyUnicode_AsASCIIString,
        PyUnicode_AsEncodedString: exports9.PyUnicode_AsEncodedString,
        PyUnicode_AsUTF8AndSize: exports9.PyUnicode_AsUTF8AndSize,
        PyUnicode_AsUTF8String: exports9.PyUnicode_AsUTF8String,
        PyUnicode_Concat: exports9.PyUnicode_Concat,
        PyUnicode_Contains: exports9.PyUnicode_Contains,
        PyUnicode_DecodeFSDefaultAndSize: exports9.PyUnicode_DecodeFSDefaultAndSize,
        PyUnicode_EncodeFSDefault: exports9.PyUnicode_EncodeFSDefault,
        PyUnicode_FromEncodedObject: exports9.PyUnicode_FromEncodedObject,
        PyUnicode_FromStringAndSize: exports9.PyUnicode_FromStringAndSize,
        PyUnicode_InternInPlace: exports9.PyUnicode_InternInPlace,
        PyUnicode_RichCompare: exports9.PyUnicode_RichCompare,
        PyUnicode_Type: exports9.PyUnicode_Type,
        PyVectorcall_Call: exports9.PyVectorcall_Call,
        PyWeakref_GetObject: exports9.PyWeakref_GetObject,
        PyWeakref_NewProxy: exports9.PyWeakref_NewProxy,
        PyWeakref_NewRef: exports9.PyWeakref_NewRef,
        PyWrapperDescr_Type: exports9.PyWrapperDescr_Type,
        PyZip_Type: exports9.PyZip_Type,
        Py_BytesWarningFlag: exports9.Py_BytesWarningFlag,
        Py_CompileString: exports9.Py_CompileString,
        Py_DebugFlag: exports9.Py_DebugFlag,
        Py_DontWriteBytecodeFlag: exports9.Py_DontWriteBytecodeFlag,
        Py_FileSystemDefaultEncodeErrors: exports9.Py_FileSystemDefaultEncodeErrors,
        Py_FileSystemDefaultEncoding: exports9.Py_FileSystemDefaultEncoding,
        Py_FrozenFlag: exports9.Py_FrozenFlag,
        Py_GenericAlias: exports9.Py_GenericAlias,
        Py_GenericAliasType: exports9.Py_GenericAliasType,
        Py_GetVersion: exports9.Py_GetVersion,
        Py_HasFileSystemDefaultEncoding: exports9.Py_HasFileSystemDefaultEncoding,
        Py_HashRandomizationFlag: exports9.Py_HashRandomizationFlag,
        Py_IgnoreEnvironmentFlag: exports9.Py_IgnoreEnvironmentFlag,
        Py_InitializeEx: exports9.Py_InitializeEx,
        Py_InspectFlag: exports9.Py_InspectFlag,
        Py_InteractiveFlag: exports9.Py_InteractiveFlag,
        Py_IsInitialized: exports9.Py_IsInitialized,
        Py_IsolatedFlag: exports9.Py_IsolatedFlag,
        Py_NewRef: exports9.Py_NewRef,
        Py_NoSiteFlag: exports9.Py_NoSiteFlag,
        Py_NoUserSiteDirectory: exports9.Py_NoUserSiteDirectory,
        Py_OptimizeFlag: exports9.Py_OptimizeFlag,
        Py_QuietFlag: exports9.Py_QuietFlag,
        Py_UTF8Mode: exports9.Py_UTF8Mode,
        Py_UnbufferedStdioFlag: exports9.Py_UnbufferedStdioFlag,
        Py_VerboseFlag: exports9.Py_VerboseFlag,
        Py_XNewRef: exports9.Py_XNewRef,
        Py_hexdigits: exports9.Py_hexdigits,
        _PyAsyncGenASend_Type: exports9._PyAsyncGenASend_Type,
        _PyByteArray_empty_string: exports9._PyByteArray_empty_string,
        _PyBytes_FromXIData: exports9._PyBytes_FromXIData,
        _PyBytes_GetXIData: exports9._PyBytes_GetXIData,
        _PyCode_FromXIData: exports9._PyCode_FromXIData,
        _PyEval_BinaryOps: exports9._PyEval_BinaryOps,
        _PyEval_ConversionFuncs: exports9._PyEval_ConversionFuncs,
        _PyEval_EvalFrameDefault: exports9._PyEval_EvalFrameDefault,
        _PyExc_IncompleteInputError: exports9._PyExc_IncompleteInputError,
        _PyFunction_FromXIData: exports9._PyFunction_FromXIData,
        _PyImport_FrozenBootstrap: exports9._PyImport_FrozenBootstrap,
        _PyImport_FrozenStdlib: exports9._PyImport_FrozenStdlib,
        _PyImport_FrozenTest: exports9._PyImport_FrozenTest,
        _PyIntrinsics_BinaryFunctions: exports9._PyIntrinsics_BinaryFunctions,
        _PyIntrinsics_UnaryFunctions: exports9._PyIntrinsics_UnaryFunctions,
        _PyLong_DigitValue: exports9._PyLong_DigitValue,
        _PyMarshal_ReadObjectFromXIData: exports9._PyMarshal_ReadObjectFromXIData,
        _PyNone_Type: exports9._PyNone_Type,
        _PyNotImplemented_Type: exports9._PyNotImplemented_Type,
        _PyOS_ReadlineTState: exports9._PyOS_ReadlineTState,
        _PyPickle_LoadFromXIData: exports9._PyPickle_LoadFromXIData,
        _PyRuntime: exports9._PyRuntime,
        _PyTime_gmtime: exports9._PyTime_gmtime,
        _PyTime_localtime: exports9._PyTime_localtime,
        _PyUnion_Type: exports9._PyUnion_Type,
        _PyWarnings_Init: exports9._PyWarnings_Init,
        _PyWeakref_CallableProxyType: exports9._PyWeakref_CallableProxyType,
        _PyWeakref_ProxyType: exports9._PyWeakref_ProxyType,
        _PyWeakref_RefType: exports9._PyWeakref_RefType,
        _Py_DecRef: exports9._Py_DecRef,
        _Py_EllipsisObject: exports9._Py_EllipsisObject,
        _Py_FalseStruct: exports9._Py_FalseStruct,
        _Py_FunctionAttributeOffsets: exports9._Py_FunctionAttributeOffsets,
        _Py_HashSecret: exports9._Py_HashSecret,
        _Py_IncRef: exports9._Py_IncRef,
        _Py_InitCleanup: exports9._Py_InitCleanup,
        _Py_NoneStruct: exports9._Py_NoneStruct,
        _Py_NotImplementedStruct: exports9._Py_NotImplementedStruct,
        _Py_SpecialMethods: exports9._Py_SpecialMethods,
        _Py_SwappedOp: exports9._Py_SwappedOp,
        _Py_TrueStruct: exports9._Py_TrueStruct,
        _Py_ascii_whitespace: exports9._Py_ascii_whitespace,
        _Py_ctype_table: exports9._Py_ctype_table,
        _Py_ctype_tolower: exports9._Py_ctype_tolower,
        _Py_ctype_toupper: exports9._Py_ctype_toupper,
        _Py_hashtable_compare_direct: exports9._Py_hashtable_compare_direct,
        _Py_hashtable_hash_ptr: exports9._Py_hashtable_hash_ptr,
        _Py_union_type_or: exports9._Py_union_type_or,
        __wasm_apply_data_relocs: exports9.__wasm_apply_data_relocs,
        _initialize: exports9._initialize,
      },
      'libwasi-emulated-getpid.so': {
        _initialize: exports13._initialize,
        getpid: exports13.getpid,
      },
      'libwasi-emulated-process-clocks.so': {
        _initialize: exports14._initialize,
        clock: exports14.__clock,
        times: exports14.times,
      },
      'libwasi-emulated-signal.so': {
        __SIG_ERR: exports10.__SIG_ERR,
        __SIG_IGN: exports10.__SIG_IGN,
        __sysv_signal: exports10.signal,
        __wasm_apply_data_relocs: exports10.__wasm_apply_data_relocs,
        _initialize: exports10._initialize,
        bsd_signal: exports10.signal,
        raise: exports10.raise,
        signal: exports10.signal,
        strsignal: exports10.strsignal,
      },
    }));
    ({ exports: exports18 } = yield instantiateCore(yield module19));
    ({ exports: exports19 } = yield instantiateCore(yield module18, {
      'iter-tpl:iter/tools@0.0.1': {
        combinations: exports18['0'],
        permutations: exports18['1'],
      },
      'iter-tpl:tpl/template@0.0.1': {
        execute: exports18['2'],
      },
    }));
    memory2 = exports19.memory;
    ({ exports: exports20 } = yield instantiateCore(yield module21, {
      augments: {
        'mem1 I32Load': (ptr, off) => new DataView(exports19.memory.buffer).getInt32(ptr + off, true),
        'mem1 I32Store': (ptr, val, offset) => {
          new DataView(exports19.memory.buffer).setInt32(ptr + offset, val, true);
        },
        'mem1 I32Store8': (ptr, val, offset) => {
          new DataView(exports19.memory.buffer).setInt8(ptr + offset, val, true);
        },
        'mem1 MemorySize': ptr => exports19.memory.buffer.byteLength / 65536,
        'mem2 I32Load': (ptr, off) => new DataView(exports1.memory.buffer).getInt32(ptr + off, true),
        'mem2 I32Load8U': (ptr, off) => new DataView(exports1.memory.buffer).getUint8(ptr + off, true),
        'mem2 I32Store': (ptr, val, offset) => {
          new DataView(exports1.memory.buffer).setInt32(ptr + offset, val, true);
        },
        'mem2 MemorySize': ptr => exports1.memory.buffer.byteLength / 65536,
      },
      callee: {
        adapter0: exports12['iter-tpl:iter/tools@0.0.1#combinations'],
        adapter1: exports12['iter-tpl:iter/tools@0.0.1#permutations'],
        adapter2: exports1['iter-tpl:tpl/template@0.0.1#execute'],
      },
      flags: {
        instance1: instanceFlags1,
        instance3: instanceFlags3,
        instance6: instanceFlags6,
      },
      memory: {
        m0: exports5.memory,
      },
      post_return: {
        adapter0: exports12['cabi_post_iter-tpl:iter/tools@0.0.1#combinations'],
        adapter1: exports12['cabi_post_iter-tpl:iter/tools@0.0.1#permutations'],
      },
      realloc: {
        f0: exports12.cabi_import_realloc,
        f1: exports19.cabi_realloc,
        f8: exports1.cabi_realloc,
      },
      transcode: {
        'utf8-to-utf8 (mem0 => mem1)': trampoline182,
        'utf8-to-utf8 (mem1 => mem0)': trampoline181,
        'utf8-to-utf8 (mem1 => mem2)': trampoline183,
        'utf8-to-utf8 (mem2 => mem1)': trampoline184,
      },
    }));
    ({ exports: exports21 } = yield instantiateCore(yield module20, {
      '': {
        $imports: exports18.$imports,
        '0': exports20.adapter0,
        '1': exports20.adapter1,
        '2': exports20.adapter2,
      },
    }));
    realloc4 = exports19.cabi_realloc;
    postReturn0 = exports19['cabi_post_iter-tpl:main/bundled@0.0.1#combinations'];
    postReturn1 = exports19['cabi_post_iter-tpl:main/bundled@0.0.1#permutations'];
    postReturn2 = exports19['cabi_post_iter-tpl:main/bundled@0.0.1#template'];
    bundled001Combinations = exports19['iter-tpl:main/bundled@0.0.1#combinations'];
    bundled001Permutations = exports19['iter-tpl:main/bundled@0.0.1#permutations'];
    bundled001Template = exports19['iter-tpl:main/bundled@0.0.1#template'];
  })();
  let promise, resolve, reject;
  function runNext (value) {
    try {
      let done;
      do {
        ({ value, done } = gen.next(value));
      } while (!(value instanceof Promise) && !done);
      if (done) {
        if (resolve) resolve(value);
        else return value;
      }
      if (!promise) promise = new Promise((_resolve, _reject) => (resolve = _resolve, reject = _reject));
      value.then(runNext, reject);
    }
    catch (e) {
      if (reject) reject(e);
      else throw e;
    }
  }
  const maybeSyncReturn = runNext(null);
  return promise || maybeSyncReturn;
})();

await $init;
const bundled001 = {
  combinations: combinations,
  permutations: permutations,
  template: template,
  
};

export { bundled001 as bundled, bundled001 as 'iter-tpl:main/bundled@0.0.1',  }