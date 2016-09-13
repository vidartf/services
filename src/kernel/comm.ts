// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  JSONObject, JSONValue
} from 'phosphor/lib/algorithm/json';

import {
  DisposableDelegate
} from 'phosphor/lib/core/disposable';

import {
  IKernel, Kernel
} from './kernel';

import {
  KernelMessage
} from './messages';


/**
 * Comm channel handler.
 */
export
class CommHandler extends DisposableDelegate implements Kernel.IComm {
  /**
   * Construct a new comm channel.
   */
  constructor(target: string, id: string, kernel: IKernel, disposeCb: () => void) {
    super(disposeCb);
    this._id = id;
    this._target = target;
    this._kernel = kernel;
  }

  /**
   * The unique id for the comm channel.
   *
   * #### Notes
   * This is a read-only property.
   */
  get commId(): string {
    return this._id;
  }

  /**
   * The target name for the comm channel.
   *
   * #### Notes
   * This is a read-only property.
   */
  get targetName(): string {
    return this._target;
  }

  /**
   * Get the callback for a comm close event.
   *
   * #### Notes
   * This is called when the comm is closed from either the server or
   * client.
   *
   * **See also:** [[ICommClose]], [[close]]
   */
  get onClose(): (msg: KernelMessage.ICommCloseMsg) => void {
    return this._onClose;
  }

  /**
   * Set the callback for a comm close event.
   *
   * #### Notes
   * This is called when the comm is closed from either the server or
   * client.
   *
   * **See also:** [[close]]
   */
  set onClose(cb: (msg: KernelMessage.ICommCloseMsg) => void) {
    this._onClose = cb;
  }

  /**
   * Get the callback for a comm message received event.
   */
  get onMsg(): (msg: KernelMessage.ICommMsgMsg) => void {
    return this._onMsg;
  }

  /**
   * Set the callback for a comm message received event.
   */
  set onMsg(cb: (msg: KernelMessage.ICommMsgMsg) => void) {
    this._onMsg = cb;
  }

  /**
   * Test whether the comm has been disposed.
   *
   * #### Notes
   * This is a read-only property which is always safe to access.
   */
  get isDisposed(): boolean {
    return (this._kernel === null);
  }

  /**
   * Open a comm with optional data and metadata.
   *
   * #### Notes
   * This sends a `comm_open` message to the server.
   *
   * **See also:** [[ICommOpen]]
   */
  open(data?: JSONValue, metadata?: JSONObject): Kernel.IFuture {
    if (this.isDisposed || this._kernel.isDisposed) {
      return;
    }
    let options: KernelMessage.IOptions = {
      msgType: 'comm_open',
      channel: 'shell',
      username: this._kernel.username,
      session: this._kernel.clientId
    };
    let content: KernelMessage.ICommOpen = {
      comm_id: this._id,
      target_name: this._target,
      data: data || {}
    };
    let msg = KernelMessage.createShellMessage(options, content, metadata);
    return this._kernel.sendShellMessage(msg, false, true);
  }

  /**
   * Send a `comm_msg` message to the kernel.
   *
   * #### Notes
   * This is a no-op if the comm has been closed.
   *
   * **See also:** [[ICommMsg]]
   */
  send(data: JSONValue, metadata?: JSONObject, buffers: (ArrayBuffer | ArrayBufferView)[] = [], disposeOnDone: boolean = true): Kernel.IFuture {
    if (this.isDisposed || this._kernel.isDisposed) {
      return;
    }
    let options: KernelMessage.IOptions = {
      msgType: 'comm_msg',
      channel: 'shell',
      username: this._kernel.username,
      session: this._kernel.clientId
    };
    let content: KernelMessage.ICommMsg = {
      comm_id: this._id,
      data: data
    };
    let msg = KernelMessage.createShellMessage(options, content, metadata, buffers);
    return this._kernel.sendShellMessage(msg, false, true);
  }

  /**
   * Close the comm.
   *
   * #### Notes
   * This will send a `comm_close` message to the kernel, and call the
   * `onClose` callback if set.
   *
   * This is a no-op if the comm is already closed.
   *
   * **See also:** [[ICommClose]], [[onClose]]
   */
  close(data?: JSONValue, metadata?: JSONObject): Kernel.IFuture {
    if (this.isDisposed || this._kernel.isDisposed) {
      return;
    }
    let options: KernelMessage.IOptions = {
      msgType: 'comm_msg',
      channel: 'shell',
      username: this._kernel.username,
      session: this._kernel.clientId
    };
    let content: KernelMessage.ICommClose = {
      comm_id: this._id,
      data: data || {}
    };
    let msg = KernelMessage.createShellMessage(options, content, metadata);
    let future = this._kernel.sendShellMessage(msg, false, true);
    options.channel = 'iopub';
    let ioMsg = KernelMessage.createMessage(options, content, metadata);
    let onClose = this._onClose;
    if (onClose) {
      onClose(ioMsg as KernelMessage.ICommCloseMsg);
    }
    this.dispose();
    return future;
  }

  /**
   * Dispose of the resources held by the comm.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._onClose = null;
    this._onMsg = null;
    this._kernel = null;
    super.dispose();
  }

  private _target = '';
  private _id = '';
  private _kernel: IKernel = null;
  private _onClose: (msg: KernelMessage.ICommCloseMsg) => void = null;
  private _onMsg: (msg: KernelMessage.ICommMsgMsg) => void = null;
}
