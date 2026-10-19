/* Canvsidian — generated from src/. Run npm run build. */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => Canvsidian
});
module.exports = __toCommonJS(main_exports);
var import_obsidian7 = require("obsidian");

// node_modules/@lezer/common/dist/index.js
var DefaultBufferLength = 1024;
var nextPropID = 0;
var Range = class {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }
};
var NodeProp = class {
  /**
  Create a new node prop type.
  */
  constructor(config = {}) {
    this.id = nextPropID++;
    this.perNode = !!config.perNode;
    this.deserialize = config.deserialize || (() => {
      throw new Error("This node type doesn't define a deserialize function");
    });
    this.combine = config.combine || null;
  }
  /**
  This is meant to be used with
  [`NodeSet.extend`](#common.NodeSet.extend) or
  [`LRParser.configure`](#lr.ParserConfig.props) to compute
  prop values for each node type in the set. Takes a [match
  object](#common.NodeType^match) or function that returns undefined
  if the node type doesn't get this prop, and the prop's value if
  it does.
  */
  add(match) {
    if (this.perNode)
      throw new RangeError("Can't add per-node props to node types");
    if (typeof match != "function")
      match = NodeType.match(match);
    return (type) => {
      let result = match(type);
      return result === void 0 ? null : [this, result];
    };
  }
};
NodeProp.closedBy = new NodeProp({ deserialize: (str) => str.split(" ") });
NodeProp.openedBy = new NodeProp({ deserialize: (str) => str.split(" ") });
NodeProp.group = new NodeProp({ deserialize: (str) => str.split(" ") });
NodeProp.isolate = new NodeProp({ deserialize: (value) => {
  if (value && value != "rtl" && value != "ltr" && value != "auto")
    throw new RangeError("Invalid value for isolate: " + value);
  return value || "auto";
} });
NodeProp.contextHash = new NodeProp({ perNode: true });
NodeProp.lookAhead = new NodeProp({ perNode: true });
NodeProp.mounted = new NodeProp({ perNode: true });
var MountedTree = class {
  constructor(tree, overlay, parser2, bracketed = false) {
    this.tree = tree;
    this.overlay = overlay;
    this.parser = parser2;
    this.bracketed = bracketed;
  }
  /**
  @internal
  */
  static get(tree) {
    return tree && tree.props && tree.props[NodeProp.mounted.id];
  }
};
var noProps = /* @__PURE__ */ Object.create(null);
var NodeType = class _NodeType {
  /**
  @internal
  */
  constructor(name2, props, id, flags = 0) {
    this.name = name2;
    this.props = props;
    this.id = id;
    this.flags = flags;
  }
  /**
  Define a node type.
  */
  static define(spec) {
    let props = spec.props && spec.props.length ? /* @__PURE__ */ Object.create(null) : noProps;
    let flags = (spec.top ? 1 : 0) | (spec.skipped ? 2 : 0) | (spec.error ? 4 : 0) | (spec.name == null ? 8 : 0);
    let type = new _NodeType(spec.name || "", props, spec.id, flags);
    if (spec.props)
      for (let src of spec.props) {
        if (!Array.isArray(src))
          src = src(type);
        if (src) {
          if (src[0].perNode)
            throw new RangeError("Can't store a per-node prop on a node type");
          props[src[0].id] = src[1];
        }
      }
    return type;
  }
  /**
  Retrieves a node prop for this type. Will return `undefined` if
  the prop isn't present on this node.
  */
  prop(prop) {
    return this.props[prop.id];
  }
  /**
  True when this is the top node of a grammar.
  */
  get isTop() {
    return (this.flags & 1) > 0;
  }
  /**
  True when this node is produced by a skip rule.
  */
  get isSkipped() {
    return (this.flags & 2) > 0;
  }
  /**
  Indicates whether this is an error node.
  */
  get isError() {
    return (this.flags & 4) > 0;
  }
  /**
  When true, this node type doesn't correspond to a user-declared
  named node, for example because it is used to cache repetition.
  */
  get isAnonymous() {
    return (this.flags & 8) > 0;
  }
  /**
  Returns true when this node's name or one of its
  [groups](#common.NodeProp^group) matches the given string.
  */
  is(name2) {
    if (typeof name2 == "string") {
      if (this.name == name2)
        return true;
      let group = this.prop(NodeProp.group);
      return group ? group.indexOf(name2) > -1 : false;
    }
    return this.id == name2;
  }
  /**
  Create a function from node types to arbitrary values by
  specifying an object whose property names are node or
  [group](#common.NodeProp^group) names. Often useful with
  [`NodeProp.add`](#common.NodeProp.add). You can put multiple
  names, separated by spaces, in a single property name to map
  multiple node names to a single value.
  */
  static match(map) {
    let direct = /* @__PURE__ */ Object.create(null);
    for (let prop in map)
      for (let name2 of prop.split(" "))
        direct[name2] = map[prop];
    return (node) => {
      for (let groups = node.prop(NodeProp.group), i = -1; i < (groups ? groups.length : 0); i++) {
        let found = direct[i < 0 ? node.name : groups[i]];
        if (found)
          return found;
      }
    };
  }
};
NodeType.none = new NodeType(
  "",
  /* @__PURE__ */ Object.create(null),
  0,
  8
  /* NodeFlag.Anonymous */
);
var NodeSet = class _NodeSet {
  /**
  Create a set with the given types. The `id` property of each
  type should correspond to its position within the array.
  */
  constructor(types) {
    this.types = types;
    for (let i = 0; i < types.length; i++)
      if (types[i].id != i)
        throw new RangeError("Node type ids should correspond to array positions when creating a node set");
  }
  /**
  Create a copy of this set with some node properties added. The
  arguments to this method can be created with
  [`NodeProp.add`](#common.NodeProp.add).
  */
  extend(...props) {
    let newTypes = [];
    for (let type of this.types) {
      let newProps = null;
      for (let source of props) {
        let add = source(type);
        if (add) {
          if (!newProps)
            newProps = Object.assign({}, type.props);
          let value = add[1], prop = add[0];
          if (prop.combine && prop.id in newProps)
            value = prop.combine(newProps[prop.id], value);
          newProps[prop.id] = value;
        }
      }
      newTypes.push(newProps ? new NodeType(type.name, newProps, type.id, type.flags) : type);
    }
    return new _NodeSet(newTypes);
  }
};
var CachedNode = /* @__PURE__ */ new WeakMap();
var CachedInnerNode = /* @__PURE__ */ new WeakMap();
var IterMode;
(function(IterMode2) {
  IterMode2[IterMode2["ExcludeBuffers"] = 1] = "ExcludeBuffers";
  IterMode2[IterMode2["IncludeAnonymous"] = 2] = "IncludeAnonymous";
  IterMode2[IterMode2["IgnoreMounts"] = 4] = "IgnoreMounts";
  IterMode2[IterMode2["IgnoreOverlays"] = 8] = "IgnoreOverlays";
  IterMode2[IterMode2["EnterBracketed"] = 16] = "EnterBracketed";
})(IterMode || (IterMode = {}));
var Tree = class _Tree {
  /**
  Construct a new tree. See also [`Tree.build`](#common.Tree^build).
  */
  constructor(type, children, positions, length, props) {
    this.type = type;
    this.children = children;
    this.positions = positions;
    this.length = length;
    this.props = null;
    if (props && props.length) {
      this.props = /* @__PURE__ */ Object.create(null);
      for (let [prop, value] of props)
        this.props[typeof prop == "number" ? prop : prop.id] = value;
    }
  }
  /**
  @internal
  */
  toString() {
    let mounted = MountedTree.get(this);
    if (mounted && !mounted.overlay)
      return mounted.tree.toString();
    let children = "";
    for (let ch of this.children) {
      let str = ch.toString();
      if (str) {
        if (children)
          children += ",";
        children += str;
      }
    }
    return !this.type.name ? children : (/\W/.test(this.type.name) && !this.type.isError ? JSON.stringify(this.type.name) : this.type.name) + (children.length ? "(" + children + ")" : "");
  }
  /**
  Get a [tree cursor](#common.TreeCursor) positioned at the top of
  the tree. Mode can be used to [control](#common.IterMode) which
  nodes the cursor visits.
  */
  cursor(mode = 0) {
    return new TreeCursor(this.topNode, mode);
  }
  /**
  Get a [tree cursor](#common.TreeCursor) pointing into this tree
  at the given position and side (see
  [`moveTo`](#common.TreeCursor.moveTo).
  */
  cursorAt(pos, side = 0, mode = 0) {
    let scope = CachedNode.get(this) || this.topNode;
    let cursor = new TreeCursor(scope);
    cursor.moveTo(pos, side);
    CachedNode.set(this, cursor._tree);
    return cursor;
  }
  /**
  Get a [syntax node](#common.SyntaxNode) object for the top of the
  tree.
  */
  get topNode() {
    return new TreeNode(this, 0, 0, null);
  }
  /**
  Get the [syntax node](#common.SyntaxNode) at the given position.
  If `side` is -1, this will move into nodes that end at the
  position. If 1, it'll move into nodes that start at the
  position. With 0, it'll only enter nodes that cover the position
  from both sides.
  
  Note that this will not enter
  [overlays](#common.MountedTree.overlay), and you often want
  [`resolveInner`](#common.Tree.resolveInner) instead.
  */
  resolve(pos, side = 0) {
    let node = resolveNode(CachedNode.get(this) || this.topNode, pos, side, false);
    CachedNode.set(this, node);
    return node;
  }
  /**
  Like [`resolve`](#common.Tree.resolve), but will enter
  [overlaid](#common.MountedTree.overlay) nodes, producing a syntax node
  pointing into the innermost overlaid tree at the given position
  (with parent links going through all parent structure, including
  the host trees).
  */
  resolveInner(pos, side = 0) {
    let node = resolveNode(CachedInnerNode.get(this) || this.topNode, pos, side, true);
    CachedInnerNode.set(this, node);
    return node;
  }
  /**
  In some situations, it can be useful to iterate through all
  nodes around a position, including those in overlays that don't
  directly cover the position. This method gives you an iterator
  that will produce all nodes, from small to big, around the given
  position.
  */
  resolveStack(pos, side = 0) {
    return stackIterator(this, pos, side);
  }
  /**
  Iterate over the tree and its children, calling `enter` for any
  node that touches the `from`/`to` region (if given) before
  running over such a node's children, and `leave` (if given) when
  leaving the node. When `enter` returns `false`, that node will
  not have its children iterated over (or `leave` called).
  */
  iterate(spec) {
    let { enter, leave, from = 0, to = this.length } = spec;
    let mode = spec.mode || 0, anon = (mode & IterMode.IncludeAnonymous) > 0;
    for (let c = this.cursor(mode | IterMode.IncludeAnonymous); ; ) {
      let entered = false;
      if (c.from <= to && c.to >= from && (!anon && c.type.isAnonymous || enter(c) !== false)) {
        if (c.firstChild())
          continue;
        entered = true;
      }
      for (; ; ) {
        if (entered && leave && (anon || !c.type.isAnonymous))
          leave(c);
        if (c.nextSibling())
          break;
        if (!c.parent())
          return;
        entered = true;
      }
    }
  }
  /**
  Get the value of the given [node prop](#common.NodeProp) for this
  node. Works with both per-node and per-type props.
  */
  prop(prop) {
    return !prop.perNode ? this.type.prop(prop) : this.props ? this.props[prop.id] : void 0;
  }
  /**
  Returns the node's [per-node props](#common.NodeProp.perNode) in a
  format that can be passed to the [`Tree`](#common.Tree)
  constructor.
  */
  get propValues() {
    let result = [];
    if (this.props)
      for (let id in this.props)
        result.push([+id, this.props[id]]);
    return result;
  }
  /**
  Balance the direct children of this tree, producing a copy of
  which may have children grouped into subtrees with type
  [`NodeType.none`](#common.NodeType^none).
  */
  balance(config = {}) {
    return this.children.length <= 8 ? this : balanceRange(NodeType.none, this.children, this.positions, 0, this.children.length, 0, this.length, (children, positions, length) => new _Tree(this.type, children, positions, length, this.propValues), config.makeTree || ((children, positions, length) => new _Tree(NodeType.none, children, positions, length)));
  }
  /**
  Build a tree from a postfix-ordered buffer of node information,
  or a cursor over such a buffer.
  */
  static build(data) {
    return buildTree(data);
  }
};
Tree.empty = new Tree(NodeType.none, [], [], 0);
var FlatBufferCursor = class _FlatBufferCursor {
  constructor(buffer, index) {
    this.buffer = buffer;
    this.index = index;
  }
  get id() {
    return this.buffer[this.index - 4];
  }
  get start() {
    return this.buffer[this.index - 3];
  }
  get end() {
    return this.buffer[this.index - 2];
  }
  get size() {
    return this.buffer[this.index - 1];
  }
  get pos() {
    return this.index;
  }
  next() {
    this.index -= 4;
  }
  fork() {
    return new _FlatBufferCursor(this.buffer, this.index);
  }
};
var TreeBuffer = class _TreeBuffer {
  /**
  Create a tree buffer.
  */
  constructor(buffer, length, set) {
    this.buffer = buffer;
    this.length = length;
    this.set = set;
  }
  /**
  @internal
  */
  get type() {
    return NodeType.none;
  }
  /**
  @internal
  */
  toString() {
    let result = [];
    for (let index = 0; index < this.buffer.length; ) {
      result.push(this.childString(index));
      index = this.buffer[index + 3];
    }
    return result.join(",");
  }
  /**
  @internal
  */
  childString(index) {
    let id = this.buffer[index], endIndex = this.buffer[index + 3];
    let type = this.set.types[id], result = type.name;
    if (/\W/.test(result) && !type.isError)
      result = JSON.stringify(result);
    index += 4;
    if (endIndex == index)
      return result;
    let children = [];
    while (index < endIndex) {
      children.push(this.childString(index));
      index = this.buffer[index + 3];
    }
    return result + "(" + children.join(",") + ")";
  }
  /**
  @internal
  */
  findChild(startIndex, endIndex, dir, pos, side) {
    let { buffer } = this, pick = -1;
    for (let i = startIndex; i != endIndex; i = buffer[i + 3]) {
      if (checkSide(side, pos, buffer[i + 1], buffer[i + 2])) {
        pick = i;
        if (dir > 0)
          break;
      }
    }
    return pick;
  }
  /**
  @internal
  */
  slice(startI, endI, from) {
    let b = this.buffer;
    let copy = new Uint16Array(endI - startI), len = 0;
    for (let i = startI, j = 0; i < endI; ) {
      copy[j++] = b[i++];
      copy[j++] = b[i++] - from;
      let to = copy[j++] = b[i++] - from;
      copy[j++] = b[i++] - startI;
      len = Math.max(len, to);
    }
    return new _TreeBuffer(copy, len, this.set);
  }
};
function checkSide(side, pos, from, to) {
  switch (side) {
    case -2:
      return from < pos;
    case -1:
      return to >= pos && from < pos;
    case 0:
      return from < pos && to > pos;
    case 1:
      return from <= pos && to > pos;
    case 2:
      return to > pos;
    case 4:
      return true;
  }
}
function resolveNode(node, pos, side, overlays) {
  var _a;
  while (node.from == node.to || (side < 1 ? node.from >= pos : node.from > pos) || (side > -1 ? node.to <= pos : node.to < pos)) {
    let parent = !overlays && node instanceof TreeNode && node.index < 0 ? null : node.parent;
    if (!parent)
      return node;
    node = parent;
  }
  let mode = overlays ? 0 : IterMode.IgnoreOverlays;
  if (overlays)
    for (let scan = node, parent = scan.parent; parent; scan = parent, parent = scan.parent) {
      if (scan instanceof TreeNode && scan.index < 0 && ((_a = parent.enter(pos, side, mode)) === null || _a === void 0 ? void 0 : _a.from) != scan.from)
        node = parent;
    }
  for (; ; ) {
    let inner = node.enter(pos, side, mode);
    if (!inner)
      return node;
    node = inner;
  }
}
var BaseNode = class {
  cursor(mode = 0) {
    return new TreeCursor(this, mode);
  }
  getChild(type, before = null, after = null) {
    let r = getChildren(this, type, before, after);
    return r.length ? r[0] : null;
  }
  getChildren(type, before = null, after = null) {
    return getChildren(this, type, before, after);
  }
  resolve(pos, side = 0) {
    return resolveNode(this, pos, side, false);
  }
  resolveInner(pos, side = 0) {
    return resolveNode(this, pos, side, true);
  }
  matchContext(context) {
    return matchNodeContext(this.parent, context);
  }
  enterUnfinishedNodesBefore(pos) {
    let scan = this.childBefore(pos), node = this;
    while (scan) {
      let last = scan.lastChild;
      if (!last || last.to != scan.to)
        break;
      if (last.type.isError && last.from == last.to) {
        node = scan;
        scan = last.prevSibling;
      } else {
        scan = last;
      }
    }
    return node;
  }
  get node() {
    return this;
  }
  get next() {
    return this.parent;
  }
};
var TreeNode = class _TreeNode extends BaseNode {
  constructor(_tree, from, index, _parent) {
    super();
    this._tree = _tree;
    this.from = from;
    this.index = index;
    this._parent = _parent;
  }
  get type() {
    return this._tree.type;
  }
  get name() {
    return this._tree.type.name;
  }
  get to() {
    return this.from + this._tree.length;
  }
  nextChild(i, dir, pos, side, mode = 0) {
    for (let parent = this; ; ) {
      for (let { children, positions } = parent._tree, e = dir > 0 ? children.length : -1; i != e; i += dir) {
        let next = children[i], start = positions[i] + parent.from, mounted;
        if (!(mode & IterMode.EnterBracketed && next instanceof Tree && (mounted = MountedTree.get(next)) && !mounted.overlay && mounted.bracketed && pos >= start && pos <= start + next.length) && !checkSide(side, pos, start, start + next.length))
          continue;
        if (next instanceof TreeBuffer) {
          if (mode & IterMode.ExcludeBuffers)
            continue;
          let index = next.findChild(0, next.buffer.length, dir, pos - start, side);
          if (index > -1)
            return new BufferNode(new BufferContext(parent, next, i, start), null, index);
        } else if (mode & IterMode.IncludeAnonymous || (!next.type.isAnonymous || hasChild(next))) {
          let mounted2;
          if (!(mode & IterMode.IgnoreMounts) && (mounted2 = MountedTree.get(next)) && !mounted2.overlay)
            return new _TreeNode(mounted2.tree, start, i, parent);
          let inner = new _TreeNode(next, start, i, parent);
          return mode & IterMode.IncludeAnonymous || !inner.type.isAnonymous ? inner : inner.nextChild(dir < 0 ? next.children.length - 1 : 0, dir, pos, side, mode);
        }
      }
      if (mode & IterMode.IncludeAnonymous || !parent.type.isAnonymous)
        return null;
      if (parent.index >= 0)
        i = parent.index + dir;
      else
        i = dir < 0 ? -1 : parent._parent._tree.children.length;
      parent = parent._parent;
      if (!parent)
        return null;
    }
  }
  get firstChild() {
    return this.nextChild(
      0,
      1,
      0,
      4
      /* Side.DontCare */
    );
  }
  get lastChild() {
    return this.nextChild(
      this._tree.children.length - 1,
      -1,
      0,
      4
      /* Side.DontCare */
    );
  }
  childAfter(pos) {
    return this.nextChild(
      0,
      1,
      pos,
      2
      /* Side.After */
    );
  }
  childBefore(pos) {
    return this.nextChild(
      this._tree.children.length - 1,
      -1,
      pos,
      -2
      /* Side.Before */
    );
  }
  prop(prop) {
    return this._tree.prop(prop);
  }
  enter(pos, side, mode = 0) {
    let mounted;
    if (!(mode & IterMode.IgnoreOverlays) && (mounted = MountedTree.get(this._tree)) && mounted.overlay) {
      let rPos = pos - this.from, enterBracketed = mode & IterMode.EnterBracketed && mounted.bracketed;
      for (let { from, to } of mounted.overlay) {
        if ((side > 0 || enterBracketed ? from <= rPos : from < rPos) && (side < 0 || enterBracketed ? to >= rPos : to > rPos))
          return new _TreeNode(mounted.tree, mounted.overlay[0].from + this.from, -1, this);
      }
    }
    return this.nextChild(0, 1, pos, side, mode);
  }
  nextSignificantParent() {
    let val = this;
    while (val.type.isAnonymous && val._parent)
      val = val._parent;
    return val;
  }
  get parent() {
    return this._parent ? this._parent.nextSignificantParent() : null;
  }
  get nextSibling() {
    return this._parent && this.index >= 0 ? this._parent.nextChild(
      this.index + 1,
      1,
      0,
      4
      /* Side.DontCare */
    ) : null;
  }
  get prevSibling() {
    return this._parent && this.index >= 0 ? this._parent.nextChild(
      this.index - 1,
      -1,
      0,
      4
      /* Side.DontCare */
    ) : null;
  }
  get tree() {
    return this._tree;
  }
  toTree() {
    return this._tree;
  }
  /**
  @internal
  */
  toString() {
    return this._tree.toString();
  }
};
function getChildren(node, type, before, after) {
  let cur = node.cursor(), result = [];
  if (!cur.firstChild())
    return result;
  if (before != null)
    for (let found = false; !found; ) {
      found = cur.type.is(before);
      if (!cur.nextSibling())
        return result;
    }
  for (; ; ) {
    if (after != null && cur.type.is(after))
      return result;
    if (cur.type.is(type))
      result.push(cur.node);
    if (!cur.nextSibling())
      return after == null ? result : [];
  }
}
function matchNodeContext(node, context, i = context.length - 1) {
  for (let p = node; i >= 0; p = p.parent) {
    if (!p)
      return false;
    if (!p.type.isAnonymous) {
      if (context[i] && context[i] != p.name)
        return false;
      i--;
    }
  }
  return true;
}
var BufferContext = class {
  constructor(parent, buffer, index, start) {
    this.parent = parent;
    this.buffer = buffer;
    this.index = index;
    this.start = start;
  }
};
var BufferNode = class _BufferNode extends BaseNode {
  get name() {
    return this.type.name;
  }
  get from() {
    return this.context.start + this.context.buffer.buffer[this.index + 1];
  }
  get to() {
    return this.context.start + this.context.buffer.buffer[this.index + 2];
  }
  constructor(context, _parent, index) {
    super();
    this.context = context;
    this._parent = _parent;
    this.index = index;
    this.type = context.buffer.set.types[context.buffer.buffer[index]];
  }
  child(dir, pos, side) {
    let { buffer } = this.context;
    let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.context.start, side);
    return index < 0 ? null : new _BufferNode(this.context, this, index);
  }
  get firstChild() {
    return this.child(
      1,
      0,
      4
      /* Side.DontCare */
    );
  }
  get lastChild() {
    return this.child(
      -1,
      0,
      4
      /* Side.DontCare */
    );
  }
  childAfter(pos) {
    return this.child(
      1,
      pos,
      2
      /* Side.After */
    );
  }
  childBefore(pos) {
    return this.child(
      -1,
      pos,
      -2
      /* Side.Before */
    );
  }
  prop(prop) {
    return this.type.prop(prop);
  }
  enter(pos, side, mode = 0) {
    if (mode & IterMode.ExcludeBuffers)
      return null;
    let { buffer } = this.context;
    let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], side > 0 ? 1 : -1, pos - this.context.start, side);
    return index < 0 ? null : new _BufferNode(this.context, this, index);
  }
  get parent() {
    return this._parent || this.context.parent.nextSignificantParent();
  }
  externalSibling(dir) {
    return this._parent ? null : this.context.parent.nextChild(
      this.context.index + dir,
      dir,
      0,
      4
      /* Side.DontCare */
    );
  }
  get nextSibling() {
    let { buffer } = this.context;
    let after = buffer.buffer[this.index + 3];
    if (after < (this._parent ? buffer.buffer[this._parent.index + 3] : buffer.buffer.length))
      return new _BufferNode(this.context, this._parent, after);
    return this.externalSibling(1);
  }
  get prevSibling() {
    let { buffer } = this.context;
    let parentStart = this._parent ? this._parent.index + 4 : 0;
    if (this.index == parentStart)
      return this.externalSibling(-1);
    return new _BufferNode(this.context, this._parent, buffer.findChild(
      parentStart,
      this.index,
      -1,
      0,
      4
      /* Side.DontCare */
    ));
  }
  get tree() {
    return null;
  }
  toTree() {
    let children = [], positions = [];
    let { buffer } = this.context;
    let startI = this.index + 4, endI = buffer.buffer[this.index + 3];
    if (endI > startI) {
      let from = buffer.buffer[this.index + 1];
      children.push(buffer.slice(startI, endI, from));
      positions.push(0);
    }
    return new Tree(this.type, children, positions, this.to - this.from);
  }
  /**
  @internal
  */
  toString() {
    return this.context.buffer.childString(this.index);
  }
};
function iterStack(heads) {
  if (!heads.length)
    return null;
  let pick = 0, picked = heads[0];
  for (let i = 1; i < heads.length; i++) {
    let node = heads[i];
    if (node.from > picked.from || node.to < picked.to) {
      picked = node;
      pick = i;
    }
  }
  let next = picked instanceof TreeNode && picked.index < 0 ? null : picked.parent;
  let newHeads = heads.slice();
  if (next)
    newHeads[pick] = next;
  else
    newHeads.splice(pick, 1);
  return new StackIterator(newHeads, picked);
}
var StackIterator = class {
  constructor(heads, node) {
    this.heads = heads;
    this.node = node;
  }
  get next() {
    return iterStack(this.heads);
  }
};
function stackIterator(tree, pos, side) {
  let inner = tree.resolveInner(pos, side), layers = null;
  for (let scan = inner instanceof TreeNode ? inner : inner.context.parent; scan; scan = scan.parent) {
    if (scan.index < 0) {
      let parent = scan.parent;
      (layers || (layers = [inner])).push(parent.resolve(pos, side));
      scan = parent;
    } else {
      let mount = MountedTree.get(scan.tree);
      if (mount && mount.overlay && mount.overlay[0].from <= pos && mount.overlay[mount.overlay.length - 1].to >= pos) {
        let root = new TreeNode(mount.tree, mount.overlay[0].from + scan.from, -1, scan);
        (layers || (layers = [inner])).push(resolveNode(root, pos, side, false));
      }
    }
  }
  return layers ? iterStack(layers) : inner;
}
var TreeCursor = class {
  /**
  Shorthand for `.type.name`.
  */
  get name() {
    return this.type.name;
  }
  /**
  @internal
  */
  constructor(node, mode = 0) {
    this.buffer = null;
    this.stack = [];
    this.index = 0;
    this.bufferNode = null;
    this.mode = mode & ~IterMode.EnterBracketed;
    if (node instanceof TreeNode) {
      this.yieldNode(node);
    } else {
      this._tree = node.context.parent;
      this.buffer = node.context;
      for (let n = node._parent; n; n = n._parent)
        this.stack.unshift(n.index);
      this.bufferNode = node;
      this.yieldBuf(node.index);
    }
  }
  yieldNode(node) {
    if (!node)
      return false;
    this._tree = node;
    this.type = node.type;
    this.from = node.from;
    this.to = node.to;
    return true;
  }
  yieldBuf(index, type) {
    this.index = index;
    let { start, buffer } = this.buffer;
    this.type = type || buffer.set.types[buffer.buffer[index]];
    this.from = start + buffer.buffer[index + 1];
    this.to = start + buffer.buffer[index + 2];
    return true;
  }
  /**
  @internal
  */
  yield(node) {
    if (!node)
      return false;
    if (node instanceof TreeNode) {
      this.buffer = null;
      return this.yieldNode(node);
    }
    this.buffer = node.context;
    return this.yieldBuf(node.index, node.type);
  }
  /**
  @internal
  */
  toString() {
    return this.buffer ? this.buffer.buffer.childString(this.index) : this._tree.toString();
  }
  /**
  @internal
  */
  enterChild(dir, pos, side) {
    if (!this.buffer)
      return this.yield(this._tree.nextChild(dir < 0 ? this._tree._tree.children.length - 1 : 0, dir, pos, side, this.mode));
    let { buffer } = this.buffer;
    let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.buffer.start, side);
    if (index < 0)
      return false;
    this.stack.push(this.index);
    return this.yieldBuf(index);
  }
  /**
  Move the cursor to this node's first child. When this returns
  false, the node has no child, and the cursor has not been moved.
  */
  firstChild() {
    return this.enterChild(
      1,
      0,
      4
      /* Side.DontCare */
    );
  }
  /**
  Move the cursor to this node's last child.
  */
  lastChild() {
    return this.enterChild(
      -1,
      0,
      4
      /* Side.DontCare */
    );
  }
  /**
  Move the cursor to the first child that ends after `pos`.
  */
  childAfter(pos) {
    return this.enterChild(
      1,
      pos,
      2
      /* Side.After */
    );
  }
  /**
  Move to the last child that starts before `pos`.
  */
  childBefore(pos) {
    return this.enterChild(
      -1,
      pos,
      -2
      /* Side.Before */
    );
  }
  /**
  Move the cursor to the child around `pos`. If side is -1 the
  child may end at that position, when 1 it may start there. This
  will also enter [overlaid](#common.MountedTree.overlay)
  [mounted](#common.NodeProp^mounted) trees unless `overlays` is
  set to false.
  */
  enter(pos, side, mode = this.mode) {
    if (!this.buffer)
      return this.yield(this._tree.enter(pos, side, mode));
    return mode & IterMode.ExcludeBuffers ? false : this.enterChild(1, pos, side);
  }
  /**
  Move to the node's parent node, if this isn't the top node.
  */
  parent() {
    if (!this.buffer)
      return this.yieldNode(this.mode & IterMode.IncludeAnonymous ? this._tree._parent : this._tree.parent);
    if (this.stack.length)
      return this.yieldBuf(this.stack.pop());
    let parent = this.mode & IterMode.IncludeAnonymous ? this.buffer.parent : this.buffer.parent.nextSignificantParent();
    this.buffer = null;
    return this.yieldNode(parent);
  }
  /**
  @internal
  */
  sibling(dir) {
    if (!this.buffer)
      return !this._tree._parent ? false : this.yield(this._tree.index < 0 ? null : this._tree._parent.nextChild(this._tree.index + dir, dir, 0, 4, this.mode));
    let { buffer } = this.buffer, d = this.stack.length - 1;
    if (dir < 0) {
      let parentStart = d < 0 ? 0 : this.stack[d] + 4;
      if (this.index != parentStart)
        return this.yieldBuf(buffer.findChild(
          parentStart,
          this.index,
          -1,
          0,
          4
          /* Side.DontCare */
        ));
    } else {
      let after = buffer.buffer[this.index + 3];
      if (after < (d < 0 ? buffer.buffer.length : buffer.buffer[this.stack[d] + 3]))
        return this.yieldBuf(after);
    }
    return d < 0 ? this.yield(this.buffer.parent.nextChild(this.buffer.index + dir, dir, 0, 4, this.mode)) : false;
  }
  /**
  Move to this node's next sibling, if any.
  */
  nextSibling() {
    return this.sibling(1);
  }
  /**
  Move to this node's previous sibling, if any.
  */
  prevSibling() {
    return this.sibling(-1);
  }
  atLastNode(dir) {
    let index, parent, { buffer } = this;
    if (buffer) {
      if (dir > 0) {
        if (this.index < buffer.buffer.buffer.length)
          return false;
      } else {
        for (let i = 0; i < this.index; i++)
          if (buffer.buffer.buffer[i + 3] < this.index)
            return false;
      }
      ({ index, parent } = buffer);
    } else {
      ({ index, _parent: parent } = this._tree);
    }
    for (; parent; { index, _parent: parent } = parent) {
      if (index > -1)
        for (let i = index + dir, e = dir < 0 ? -1 : parent._tree.children.length; i != e; i += dir) {
          let child = parent._tree.children[i];
          if (this.mode & IterMode.IncludeAnonymous || child instanceof TreeBuffer || !child.type.isAnonymous || hasChild(child))
            return false;
        }
    }
    return true;
  }
  move(dir, enter) {
    if (enter && this.enterChild(
      dir,
      0,
      4
      /* Side.DontCare */
    ))
      return true;
    for (; ; ) {
      if (this.sibling(dir))
        return true;
      if (this.atLastNode(dir) || !this.parent())
        return false;
    }
  }
  /**
  Move to the next node in a
  [pre-order](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order,_NLR)
  traversal, going from a node to its first child or, if the
  current node is empty or `enter` is false, its next sibling or
  the next sibling of the first parent node that has one.
  */
  next(enter = true) {
    return this.move(1, enter);
  }
  /**
  Move to the next node in a last-to-first pre-order traversal. A
  node is followed by its last child or, if it has none, its
  previous sibling or the previous sibling of the first parent
  node that has one.
  */
  prev(enter = true) {
    return this.move(-1, enter);
  }
  /**
  Move the cursor to the innermost node that covers `pos`. If
  `side` is -1, it will enter nodes that end at `pos`. If it is 1,
  it will enter nodes that start at `pos`.
  */
  moveTo(pos, side = 0) {
    while (this.from == this.to || (side < 1 ? this.from >= pos : this.from > pos) || (side > -1 ? this.to <= pos : this.to < pos))
      if (!this.parent())
        break;
    while (this.enterChild(1, pos, side)) {
    }
    return this;
  }
  /**
  Get a [syntax node](#common.SyntaxNode) at the cursor's current
  position.
  */
  get node() {
    if (!this.buffer)
      return this._tree;
    let cache = this.bufferNode, result = null, depth = 0;
    if (cache && cache.context == this.buffer) {
      scan: for (let index = this.index, d = this.stack.length; d >= 0; ) {
        for (let c = cache; c; c = c._parent)
          if (c.index == index) {
            if (index == this.index)
              return c;
            result = c;
            depth = d + 1;
            break scan;
          }
        index = this.stack[--d];
      }
    }
    for (let i = depth; i < this.stack.length; i++)
      result = new BufferNode(this.buffer, result, this.stack[i]);
    return this.bufferNode = new BufferNode(this.buffer, result, this.index);
  }
  /**
  Get the [tree](#common.Tree) that represents the current node, if
  any. Will return null when the node is in a [tree
  buffer](#common.TreeBuffer).
  */
  get tree() {
    return this.buffer ? null : this._tree._tree;
  }
  /**
  Iterate over the current node and all its descendants, calling
  `enter` when entering a node and `leave`, if given, when leaving
  one. When `enter` returns `false`, any children of that node are
  skipped, and `leave` isn't called for it.
  */
  iterate(enter, leave) {
    for (let depth = 0; ; ) {
      let mustLeave = false;
      if (this.type.isAnonymous || enter(this) !== false) {
        if (this.firstChild()) {
          depth++;
          continue;
        }
        if (!this.type.isAnonymous)
          mustLeave = true;
      }
      for (; ; ) {
        if (mustLeave && leave)
          leave(this);
        mustLeave = this.type.isAnonymous;
        if (!depth)
          return;
        if (this.nextSibling())
          break;
        this.parent();
        depth--;
        mustLeave = true;
      }
    }
  }
  /**
  Test whether the current node matches a given context—a sequence
  of direct parent node names. Empty strings in the context array
  are treated as wildcards.
  */
  matchContext(context) {
    if (!this.buffer)
      return matchNodeContext(this.node.parent, context);
    let { buffer } = this.buffer, { types } = buffer.set;
    for (let i = context.length - 1, d = this.stack.length - 1; i >= 0; d--) {
      if (d < 0)
        return matchNodeContext(this._tree, context, i);
      let type = types[buffer.buffer[this.stack[d]]];
      if (!type.isAnonymous) {
        if (context[i] && context[i] != type.name)
          return false;
        i--;
      }
    }
    return true;
  }
};
function hasChild(tree) {
  return tree.children.some((ch) => ch instanceof TreeBuffer || !ch.type.isAnonymous || hasChild(ch));
}
function buildTree(data) {
  var _a;
  let { buffer, nodeSet, maxBufferLength = DefaultBufferLength, reused = [], minRepeatType = nodeSet.types.length } = data;
  let cursor = Array.isArray(buffer) ? new FlatBufferCursor(buffer, buffer.length) : buffer;
  let types = nodeSet.types;
  let contextHash = 0, lookAhead = 0;
  function takeNode(parentStart, minPos, children2, positions2, inRepeat, depth) {
    let { id, start, end, size } = cursor;
    let lookAheadAtStart = lookAhead, contextAtStart = contextHash;
    if (size < 0) {
      cursor.next();
      if (size == -1) {
        let node2 = reused[id];
        children2.push(node2);
        positions2.push(start - parentStart);
        return;
      } else if (size == -3) {
        contextHash = id;
        return;
      } else if (size == -4) {
        lookAhead = id;
        return;
      } else {
        throw new RangeError(`Unrecognized record size: ${size}`);
      }
    }
    let type = types[id], node, buffer2;
    let startPos = start - parentStart;
    if (end - start <= maxBufferLength && (buffer2 = findBufferSize(cursor.pos - minPos, inRepeat))) {
      let data2 = new Uint16Array(buffer2.size - buffer2.skip);
      let endPos = cursor.pos - buffer2.size, index = data2.length;
      while (cursor.pos > endPos)
        index = copyToBuffer(buffer2.start, data2, index);
      node = new TreeBuffer(data2, end - buffer2.start, nodeSet);
      startPos = buffer2.start - parentStart;
    } else {
      let endPos = cursor.pos - size;
      cursor.next();
      let localChildren = [], localPositions = [];
      let localInRepeat = id >= minRepeatType ? id : -1;
      let lastGroup = 0, lastEnd = end;
      while (cursor.pos > endPos) {
        if (localInRepeat >= 0 && cursor.id == localInRepeat && cursor.size >= 0) {
          if (cursor.end <= lastEnd - maxBufferLength) {
            makeRepeatLeaf(localChildren, localPositions, start, lastGroup, cursor.end, lastEnd, localInRepeat, lookAheadAtStart, contextAtStart);
            lastGroup = localChildren.length;
            lastEnd = cursor.end;
          }
          cursor.next();
        } else if (depth > 2500) {
          takeFlatNode(start, endPos, localChildren, localPositions);
        } else {
          takeNode(start, endPos, localChildren, localPositions, localInRepeat, depth + 1);
        }
      }
      if (localInRepeat >= 0 && lastGroup > 0 && lastGroup < localChildren.length)
        makeRepeatLeaf(localChildren, localPositions, start, lastGroup, start, lastEnd, localInRepeat, lookAheadAtStart, contextAtStart);
      localChildren.reverse();
      localPositions.reverse();
      if (localInRepeat > -1 && lastGroup > 0) {
        let make = makeBalanced(type, contextAtStart);
        node = balanceRange(type, localChildren, localPositions, 0, localChildren.length, 0, end - start, make, make);
      } else {
        node = makeTree(type, localChildren, localPositions, end - start, lookAheadAtStart - end, contextAtStart);
      }
    }
    children2.push(node);
    positions2.push(startPos);
  }
  function takeFlatNode(parentStart, minPos, children2, positions2) {
    let nodes = [];
    let nodeCount = 0, stopAt = -1;
    while (cursor.pos > minPos) {
      let { id, start, end, size } = cursor;
      if (size > 4) {
        cursor.next();
      } else if (stopAt > -1 && start < stopAt) {
        break;
      } else {
        if (stopAt < 0)
          stopAt = end - maxBufferLength;
        nodes.push(id, start, end);
        nodeCount++;
        cursor.next();
      }
    }
    if (nodeCount) {
      let buffer2 = new Uint16Array(nodeCount * 4);
      let start = nodes[nodes.length - 2];
      for (let i = nodes.length - 3, j = 0; i >= 0; i -= 3) {
        buffer2[j++] = nodes[i];
        buffer2[j++] = nodes[i + 1] - start;
        buffer2[j++] = nodes[i + 2] - start;
        buffer2[j++] = j;
      }
      children2.push(new TreeBuffer(buffer2, nodes[2] - start, nodeSet));
      positions2.push(start - parentStart);
    }
  }
  function makeBalanced(type, contextHash2) {
    return (children2, positions2, length2) => {
      let lookAhead2 = 0, lastI = children2.length - 1, last, lookAheadProp;
      if (lastI >= 0 && (last = children2[lastI]) instanceof Tree) {
        if (!lastI && last.type == type && last.length == length2)
          return last;
        if (lookAheadProp = last.prop(NodeProp.lookAhead))
          lookAhead2 = positions2[lastI] + last.length + lookAheadProp;
      }
      return makeTree(type, children2, positions2, length2, lookAhead2, contextHash2);
    };
  }
  function makeRepeatLeaf(children2, positions2, base, i, from, to, type, lookAhead2, contextHash2) {
    let localChildren = [], localPositions = [];
    while (children2.length > i) {
      localChildren.push(children2.pop());
      localPositions.push(positions2.pop() + base - from);
    }
    children2.push(makeTree(nodeSet.types[type], localChildren, localPositions, to - from, lookAhead2 - to, contextHash2));
    positions2.push(from - base);
  }
  function makeTree(type, children2, positions2, length2, lookAhead2, contextHash2, props) {
    if (contextHash2) {
      let pair = [NodeProp.contextHash, contextHash2];
      props = props ? [pair].concat(props) : [pair];
    }
    if (lookAhead2 > 25) {
      let pair = [NodeProp.lookAhead, lookAhead2];
      props = props ? [pair].concat(props) : [pair];
    }
    return new Tree(type, children2, positions2, length2, props);
  }
  function findBufferSize(maxSize, inRepeat) {
    let fork = cursor.fork();
    let size = 0, start = 0, skip = 0, minStart = fork.end - maxBufferLength;
    let result = { size: 0, start: 0, skip: 0 };
    scan: for (let minPos = fork.pos - maxSize; fork.pos > minPos; ) {
      let nodeSize2 = fork.size;
      if (fork.id == inRepeat && nodeSize2 >= 0) {
        result.size = size;
        result.start = start;
        result.skip = skip;
        skip += 4;
        size += 4;
        fork.next();
        continue;
      }
      let startPos = fork.pos - nodeSize2;
      if (nodeSize2 < 0 || startPos < minPos || fork.start < minStart)
        break;
      let localSkipped = fork.id >= minRepeatType ? 4 : 0;
      let nodeStart = fork.start;
      fork.next();
      while (fork.pos > startPos) {
        if (fork.size < 0) {
          if (fork.size == -3 || fork.size == -4)
            localSkipped += 4;
          else
            break scan;
        } else if (fork.id >= minRepeatType) {
          localSkipped += 4;
        }
        fork.next();
      }
      start = nodeStart;
      size += nodeSize2;
      skip += localSkipped;
    }
    if (inRepeat < 0 || size == maxSize) {
      result.size = size;
      result.start = start;
      result.skip = skip;
    }
    return result.size > 4 ? result : void 0;
  }
  function copyToBuffer(bufferStart, buffer2, index) {
    let { id, start, end, size } = cursor;
    cursor.next();
    if (size >= 0 && id < minRepeatType) {
      let startIndex = index;
      if (size > 4) {
        let endPos = cursor.pos - (size - 4);
        while (cursor.pos > endPos)
          index = copyToBuffer(bufferStart, buffer2, index);
      }
      buffer2[--index] = startIndex;
      buffer2[--index] = end - bufferStart;
      buffer2[--index] = start - bufferStart;
      buffer2[--index] = id;
    } else if (size == -3) {
      contextHash = id;
    } else if (size == -4) {
      lookAhead = id;
    }
    return index;
  }
  let children = [], positions = [];
  while (cursor.pos > 0)
    takeNode(data.start || 0, data.bufferStart || 0, children, positions, -1, 0);
  let length = (_a = data.length) !== null && _a !== void 0 ? _a : children.length ? positions[0] + children[0].length : 0;
  return new Tree(types[data.topID], children.reverse(), positions.reverse(), length);
}
var nodeSizeCache = /* @__PURE__ */ new WeakMap();
function nodeSize(balanceType, node) {
  if (!balanceType.isAnonymous || node instanceof TreeBuffer || node.type != balanceType)
    return 1;
  let size = nodeSizeCache.get(node);
  if (size == null) {
    size = 1;
    for (let child of node.children) {
      if (child.type != balanceType || !(child instanceof Tree)) {
        size = 1;
        break;
      }
      size += nodeSize(balanceType, child);
    }
    nodeSizeCache.set(node, size);
  }
  return size;
}
function balanceRange(balanceType, children, positions, from, to, start, length, mkTop, mkTree) {
  let total = 0;
  for (let i = from; i < to; i++)
    total += nodeSize(balanceType, children[i]);
  let maxChild = Math.ceil(
    total * 1.5 / 8
    /* Balance.BranchFactor */
  );
  let localChildren = [], localPositions = [];
  function divide(children2, positions2, from2, to2, offset) {
    for (let i = from2; i < to2; ) {
      let groupFrom = i, groupStart = positions2[i], groupSize = nodeSize(balanceType, children2[i]);
      i++;
      for (; i < to2; i++) {
        let nextSize = nodeSize(balanceType, children2[i]);
        if (groupSize + nextSize >= maxChild)
          break;
        groupSize += nextSize;
      }
      if (i == groupFrom + 1) {
        if (groupSize > maxChild) {
          let only = children2[groupFrom];
          divide(only.children, only.positions, 0, only.children.length, positions2[groupFrom] + offset);
          continue;
        }
        localChildren.push(children2[groupFrom]);
      } else {
        let length2 = positions2[i - 1] + children2[i - 1].length - groupStart;
        localChildren.push(balanceRange(balanceType, children2, positions2, groupFrom, i, groupStart, length2, null, mkTree));
      }
      localPositions.push(groupStart + offset - start);
    }
  }
  divide(children, positions, from, to, 0);
  return (mkTop || mkTree)(localChildren, localPositions, length);
}
var Parser = class {
  /**
  Start a parse, returning a [partial parse](#common.PartialParse)
  object. [`fragments`](#common.TreeFragment) can be passed in to
  make the parse incremental.
  
  By default, the entire input is parsed. You can pass `ranges`,
  which should be a sorted array of non-empty, non-overlapping
  ranges, to parse only those ranges. The tree returned in that
  case will start at `ranges[0].from`.
  */
  startParse(input, fragments, ranges) {
    if (typeof input == "string")
      input = new StringInput(input);
    ranges = !ranges ? [new Range(0, input.length)] : ranges.length ? ranges.map((r) => new Range(r.from, r.to)) : [new Range(0, 0)];
    return this.createParse(input, fragments || [], ranges);
  }
  /**
  Run a full parse, returning the resulting tree.
  */
  parse(input, fragments, ranges) {
    let parse = this.startParse(input, fragments, ranges);
    for (; ; ) {
      let done = parse.advance();
      if (done)
        return done;
    }
  }
};
var StringInput = class {
  constructor(string2) {
    this.string = string2;
  }
  get length() {
    return this.string.length;
  }
  chunk(from) {
    return this.string.slice(from);
  }
  get lineChunks() {
    return false;
  }
  read(from, to) {
    return this.string.slice(from, to);
  }
};
var stoppedInner = new NodeProp({ perNode: true });

// node_modules/@lezer/highlight/dist/index.js
var nextTagID = 0;
var Tag = class _Tag {
  /**
  @internal
  */
  constructor(name2, set, base, modified) {
    this.name = name2;
    this.set = set;
    this.base = base;
    this.modified = modified;
    this.id = nextTagID++;
  }
  toString() {
    let { name: name2 } = this;
    for (let mod of this.modified)
      if (mod.name)
        name2 = `${mod.name}(${name2})`;
    return name2;
  }
  static define(nameOrParent, parent) {
    let name2 = typeof nameOrParent == "string" ? nameOrParent : "?";
    if (nameOrParent instanceof _Tag)
      parent = nameOrParent;
    if (parent === null || parent === void 0 ? void 0 : parent.base)
      throw new Error("Can not derive from a modified tag");
    let tag = new _Tag(name2, [], null, []);
    tag.set.push(tag);
    if (parent)
      for (let t2 of parent.set)
        tag.set.push(t2);
    return tag;
  }
  /**
  Define a tag _modifier_, which is a function that, given a tag,
  will return a tag that is a subtag of the original. Applying the
  same modifier to a twice tag will return the same value (`m1(t1)
  == m1(t1)`) and applying multiple modifiers will, regardless or
  order, produce the same tag (`m1(m2(t1)) == m2(m1(t1))`).
  
  When multiple modifiers are applied to a given base tag, each
  smaller set of modifiers is registered as a parent, so that for
  example `m1(m2(m3(t1)))` is a subtype of `m1(m2(t1))`,
  `m1(m3(t1)`, and so on.
  */
  static defineModifier(name2) {
    let mod = new Modifier(name2);
    return (tag) => {
      if (tag.modified.indexOf(mod) > -1)
        return tag;
      return Modifier.get(tag.base || tag, tag.modified.concat(mod).sort((a, b) => a.id - b.id));
    };
  }
};
var nextModifierID = 0;
var Modifier = class _Modifier {
  constructor(name2) {
    this.name = name2;
    this.instances = [];
    this.id = nextModifierID++;
  }
  static get(base, mods) {
    if (!mods.length)
      return base;
    let exists = mods[0].instances.find((t2) => t2.base == base && sameArray(mods, t2.modified));
    if (exists)
      return exists;
    let set = [], tag = new Tag(base.name, set, base, mods);
    for (let m of mods)
      m.instances.push(tag);
    let configs = powerSet(mods);
    for (let parent of base.set)
      if (!parent.modified.length)
        for (let config of configs)
          set.push(_Modifier.get(parent, config));
    return tag;
  }
};
function sameArray(a, b) {
  return a.length == b.length && a.every((x, i) => x == b[i]);
}
function powerSet(array) {
  let sets = [[]];
  for (let i = 0; i < array.length; i++) {
    for (let j = 0, e = sets.length; j < e; j++) {
      sets.push(sets[j].concat(array[i]));
    }
  }
  return sets.sort((a, b) => b.length - a.length);
}
function styleTags(spec) {
  let byName = /* @__PURE__ */ Object.create(null);
  for (let prop in spec) {
    let tags2 = spec[prop];
    if (!Array.isArray(tags2))
      tags2 = [tags2];
    for (let part of prop.split(" "))
      if (part) {
        let pieces = [], mode = 2, rest = part;
        for (let pos = 0; ; ) {
          if (rest == "..." && pos > 0 && pos + 3 == part.length) {
            mode = 1;
            break;
          }
          let m = /^"(?:[^"\\]|\\.)*?"|[^\/!]+/.exec(rest);
          if (!m)
            throw new RangeError("Invalid path: " + part);
          pieces.push(m[0] == "*" ? "" : m[0][0] == '"' ? JSON.parse(m[0]) : m[0]);
          pos += m[0].length;
          if (pos == part.length)
            break;
          let next = part[pos++];
          if (pos == part.length && next == "!") {
            mode = 0;
            break;
          }
          if (next != "/")
            throw new RangeError("Invalid path: " + part);
          rest = part.slice(pos);
        }
        let last = pieces.length - 1, inner = pieces[last];
        if (!inner)
          throw new RangeError("Invalid path: " + part);
        let rule = new Rule(tags2, mode, last > 0 ? pieces.slice(0, last) : null);
        byName[inner] = rule.sort(byName[inner]);
      }
  }
  return ruleNodeProp.add(byName);
}
var ruleNodeProp = new NodeProp({
  combine(a, b) {
    let cur, root, take;
    while (a || b) {
      if (!a || b && a.depth <= b.depth) {
        take = b;
        b = b.next;
      } else {
        take = a;
        a = a.next;
      }
      if (cur && cur.mode == take.mode && !take.context && !cur.context)
        continue;
      let copy = new Rule(take.tags, take.mode, take.context);
      if (cur)
        cur.next = copy;
      else
        root = copy;
      cur = copy;
    }
    return root;
  }
});
var Rule = class {
  constructor(tags2, mode, context, next) {
    this.tags = tags2;
    this.mode = mode;
    this.context = context;
    this.next = next;
  }
  get opaque() {
    return this.mode == 0;
  }
  get inherit() {
    return this.mode == 1;
  }
  sort(other) {
    if (!other || other.depth < this.depth) {
      this.next = other;
      return this;
    }
    other.next = this.sort(other.next);
    return other;
  }
  get depth() {
    return this.context ? this.context.length : 0;
  }
};
Rule.empty = new Rule([], 2, null);
function tagHighlighter(tags2, options) {
  let map = /* @__PURE__ */ Object.create(null);
  for (let style of tags2) {
    if (!Array.isArray(style.tag))
      map[style.tag.id] = style.class;
    else
      for (let tag of style.tag)
        map[tag.id] = style.class;
  }
  let { scope, all = null } = options || {};
  return {
    style: (tags3) => {
      let cls = all;
      for (let tag of tags3) {
        for (let sub of tag.set) {
          let tagClass = map[sub.id];
          if (tagClass) {
            cls = cls ? cls + " " + tagClass : tagClass;
            break;
          }
        }
      }
      return cls;
    },
    scope
  };
}
var t = Tag.define;
var comment = t();
var name = t();
var typeName = t(name);
var propertyName = t(name);
var literal = t();
var string = t(literal);
var number = t(literal);
var content = t();
var heading = t(content);
var keyword = t();
var operator = t();
var punctuation = t();
var bracket = t(punctuation);
var meta = t();
var tags = {
  /**
  A comment.
  */
  comment,
  /**
  A line [comment](#highlight.tags.comment).
  */
  lineComment: t(comment),
  /**
  A block [comment](#highlight.tags.comment).
  */
  blockComment: t(comment),
  /**
  A documentation [comment](#highlight.tags.comment).
  */
  docComment: t(comment),
  /**
  Any kind of identifier.
  */
  name,
  /**
  The [name](#highlight.tags.name) of a variable.
  */
  variableName: t(name),
  /**
  A type [name](#highlight.tags.name).
  */
  typeName,
  /**
  A tag name (subtag of [`typeName`](#highlight.tags.typeName)).
  */
  tagName: t(typeName),
  /**
  A property or field [name](#highlight.tags.name).
  */
  propertyName,
  /**
  An attribute name (subtag of [`propertyName`](#highlight.tags.propertyName)).
  */
  attributeName: t(propertyName),
  /**
  The [name](#highlight.tags.name) of a class.
  */
  className: t(name),
  /**
  A label [name](#highlight.tags.name).
  */
  labelName: t(name),
  /**
  A namespace [name](#highlight.tags.name).
  */
  namespace: t(name),
  /**
  The [name](#highlight.tags.name) of a macro.
  */
  macroName: t(name),
  /**
  A literal value.
  */
  literal,
  /**
  A string [literal](#highlight.tags.literal).
  */
  string,
  /**
  A documentation [string](#highlight.tags.string).
  */
  docString: t(string),
  /**
  A character literal (subtag of [string](#highlight.tags.string)).
  */
  character: t(string),
  /**
  An attribute value (subtag of [string](#highlight.tags.string)).
  */
  attributeValue: t(string),
  /**
  A number [literal](#highlight.tags.literal).
  */
  number,
  /**
  An integer [number](#highlight.tags.number) literal.
  */
  integer: t(number),
  /**
  A floating-point [number](#highlight.tags.number) literal.
  */
  float: t(number),
  /**
  A boolean [literal](#highlight.tags.literal).
  */
  bool: t(literal),
  /**
  Regular expression [literal](#highlight.tags.literal).
  */
  regexp: t(literal),
  /**
  An escape [literal](#highlight.tags.literal), for example a
  backslash escape in a string.
  */
  escape: t(literal),
  /**
  A color [literal](#highlight.tags.literal).
  */
  color: t(literal),
  /**
  A URL [literal](#highlight.tags.literal).
  */
  url: t(literal),
  /**
  A language keyword.
  */
  keyword,
  /**
  The [keyword](#highlight.tags.keyword) for the self or this
  object.
  */
  self: t(keyword),
  /**
  The [keyword](#highlight.tags.keyword) for null.
  */
  null: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) denoting some atomic value.
  */
  atom: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) that represents a unit.
  */
  unit: t(keyword),
  /**
  A modifier [keyword](#highlight.tags.keyword).
  */
  modifier: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) that acts as an operator.
  */
  operatorKeyword: t(keyword),
  /**
  A control-flow related [keyword](#highlight.tags.keyword).
  */
  controlKeyword: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) that defines something.
  */
  definitionKeyword: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) related to defining or
  interfacing with modules.
  */
  moduleKeyword: t(keyword),
  /**
  An operator.
  */
  operator,
  /**
  An [operator](#highlight.tags.operator) that dereferences something.
  */
  derefOperator: t(operator),
  /**
  Arithmetic-related [operator](#highlight.tags.operator).
  */
  arithmeticOperator: t(operator),
  /**
  Logical [operator](#highlight.tags.operator).
  */
  logicOperator: t(operator),
  /**
  Bit [operator](#highlight.tags.operator).
  */
  bitwiseOperator: t(operator),
  /**
  Comparison [operator](#highlight.tags.operator).
  */
  compareOperator: t(operator),
  /**
  [Operator](#highlight.tags.operator) that updates its operand.
  */
  updateOperator: t(operator),
  /**
  [Operator](#highlight.tags.operator) that defines something.
  */
  definitionOperator: t(operator),
  /**
  Type-related [operator](#highlight.tags.operator).
  */
  typeOperator: t(operator),
  /**
  Control-flow [operator](#highlight.tags.operator).
  */
  controlOperator: t(operator),
  /**
  Program or markup punctuation.
  */
  punctuation,
  /**
  [Punctuation](#highlight.tags.punctuation) that separates
  things.
  */
  separator: t(punctuation),
  /**
  Bracket-style [punctuation](#highlight.tags.punctuation).
  */
  bracket,
  /**
  Angle [brackets](#highlight.tags.bracket) (usually `<` and `>`
  tokens).
  */
  angleBracket: t(bracket),
  /**
  Square [brackets](#highlight.tags.bracket) (usually `[` and `]`
  tokens).
  */
  squareBracket: t(bracket),
  /**
  Parentheses (usually `(` and `)` tokens). Subtag of
  [bracket](#highlight.tags.bracket).
  */
  paren: t(bracket),
  /**
  Braces (usually `{` and `}` tokens). Subtag of
  [bracket](#highlight.tags.bracket).
  */
  brace: t(bracket),
  /**
  Content, for example plain text in XML or markup documents.
  */
  content,
  /**
  [Content](#highlight.tags.content) that represents a heading.
  */
  heading,
  /**
  A level 1 [heading](#highlight.tags.heading).
  */
  heading1: t(heading),
  /**
  A level 2 [heading](#highlight.tags.heading).
  */
  heading2: t(heading),
  /**
  A level 3 [heading](#highlight.tags.heading).
  */
  heading3: t(heading),
  /**
  A level 4 [heading](#highlight.tags.heading).
  */
  heading4: t(heading),
  /**
  A level 5 [heading](#highlight.tags.heading).
  */
  heading5: t(heading),
  /**
  A level 6 [heading](#highlight.tags.heading).
  */
  heading6: t(heading),
  /**
  A prose [content](#highlight.tags.content) separator (such as a horizontal rule).
  */
  contentSeparator: t(content),
  /**
  [Content](#highlight.tags.content) that represents a list.
  */
  list: t(content),
  /**
  [Content](#highlight.tags.content) that represents a quote.
  */
  quote: t(content),
  /**
  [Content](#highlight.tags.content) that is emphasized.
  */
  emphasis: t(content),
  /**
  [Content](#highlight.tags.content) that is styled strong.
  */
  strong: t(content),
  /**
  [Content](#highlight.tags.content) that is part of a link.
  */
  link: t(content),
  /**
  [Content](#highlight.tags.content) that is styled as code or
  monospace.
  */
  monospace: t(content),
  /**
  [Content](#highlight.tags.content) that has a strike-through
  style.
  */
  strikethrough: t(content),
  /**
  Inserted text in a change-tracking format.
  */
  inserted: t(),
  /**
  Deleted text.
  */
  deleted: t(),
  /**
  Changed text.
  */
  changed: t(),
  /**
  An invalid or unsyntactic element.
  */
  invalid: t(),
  /**
  Metadata or meta-instruction.
  */
  meta,
  /**
  [Metadata](#highlight.tags.meta) that applies to the entire
  document.
  */
  documentMeta: t(meta),
  /**
  [Metadata](#highlight.tags.meta) that annotates or adds
  attributes to a given syntactic element.
  */
  annotation: t(meta),
  /**
  Processing instruction or preprocessor directive. Subtag of
  [meta](#highlight.tags.meta).
  */
  processingInstruction: t(meta),
  /**
  [Modifier](#highlight.Tag^defineModifier) that indicates that a
  given element is being defined. Expected to be used with the
  various [name](#highlight.tags.name) tags.
  */
  definition: Tag.defineModifier("definition"),
  /**
  [Modifier](#highlight.Tag^defineModifier) that indicates that
  something is constant. Mostly expected to be used with
  [variable names](#highlight.tags.variableName).
  */
  constant: Tag.defineModifier("constant"),
  /**
  [Modifier](#highlight.Tag^defineModifier) used to indicate that
  a [variable](#highlight.tags.variableName) or [property
  name](#highlight.tags.propertyName) is being called or defined
  as a function.
  */
  function: Tag.defineModifier("function"),
  /**
  [Modifier](#highlight.Tag^defineModifier) that can be applied to
  [names](#highlight.tags.name) to indicate that they belong to
  the language's standard environment.
  */
  standard: Tag.defineModifier("standard"),
  /**
  [Modifier](#highlight.Tag^defineModifier) that indicates a given
  [names](#highlight.tags.name) is local to some scope.
  */
  local: Tag.defineModifier("local"),
  /**
  A generic variant [modifier](#highlight.Tag^defineModifier) that
  can be used to tag language-specific alternative variants of
  some common tag. It is recommended for themes to define special
  forms of at least the [string](#highlight.tags.string) and
  [variable name](#highlight.tags.variableName) tags, since those
  come up a lot.
  */
  special: Tag.defineModifier("special")
};
for (let name2 in tags) {
  let val = tags[name2];
  if (val instanceof Tag)
    val.name = name2;
}
var classHighlighter = tagHighlighter([
  { tag: tags.link, class: "tok-link" },
  { tag: tags.heading, class: "tok-heading" },
  { tag: tags.emphasis, class: "tok-emphasis" },
  { tag: tags.strong, class: "tok-strong" },
  { tag: tags.keyword, class: "tok-keyword" },
  { tag: tags.atom, class: "tok-atom" },
  { tag: tags.bool, class: "tok-bool" },
  { tag: tags.url, class: "tok-url" },
  { tag: tags.labelName, class: "tok-labelName" },
  { tag: tags.inserted, class: "tok-inserted" },
  { tag: tags.deleted, class: "tok-deleted" },
  { tag: tags.literal, class: "tok-literal" },
  { tag: tags.string, class: "tok-string" },
  { tag: tags.number, class: "tok-number" },
  { tag: [tags.regexp, tags.escape, tags.special(tags.string)], class: "tok-string2" },
  { tag: tags.variableName, class: "tok-variableName" },
  { tag: tags.local(tags.variableName), class: "tok-variableName tok-local" },
  { tag: tags.definition(tags.variableName), class: "tok-variableName tok-definition" },
  { tag: tags.special(tags.variableName), class: "tok-variableName2" },
  { tag: tags.definition(tags.propertyName), class: "tok-propertyName tok-definition" },
  { tag: tags.typeName, class: "tok-typeName" },
  { tag: tags.namespace, class: "tok-namespace" },
  { tag: tags.className, class: "tok-className" },
  { tag: tags.macroName, class: "tok-macroName" },
  { tag: tags.propertyName, class: "tok-propertyName" },
  { tag: tags.operator, class: "tok-operator" },
  { tag: tags.comment, class: "tok-comment" },
  { tag: tags.meta, class: "tok-meta" },
  { tag: tags.invalid, class: "tok-invalid" },
  { tag: tags.punctuation, class: "tok-punctuation" }
]);

// node_modules/@lezer/markdown/dist/index.js
var CompositeBlock = class _CompositeBlock {
  static create(type, value, from, parentHash, end) {
    let hash = parentHash + (parentHash << 8) + type + (value << 4) | 0;
    return new _CompositeBlock(type, value, from, hash, end, [], []);
  }
  constructor(type, value, from, hash, end, children, positions) {
    this.type = type;
    this.value = value;
    this.from = from;
    this.hash = hash;
    this.end = end;
    this.children = children;
    this.positions = positions;
    this.hashProp = [[NodeProp.contextHash, hash]];
  }
  addChild(child, pos) {
    if (child.prop(NodeProp.contextHash) != this.hash)
      child = new Tree(child.type, child.children, child.positions, child.length, this.hashProp);
    this.children.push(child);
    this.positions.push(pos);
  }
  toTree(nodeSet, end = this.end) {
    let last = this.children.length - 1;
    if (last >= 0)
      end = Math.max(end, this.positions[last] + this.children[last].length + this.from);
    return new Tree(nodeSet.types[this.type], this.children, this.positions, end - this.from).balance({
      makeTree: (children, positions, length) => new Tree(NodeType.none, children, positions, length, this.hashProp)
    });
  }
};
var Type;
(function(Type2) {
  Type2[Type2["Document"] = 1] = "Document";
  Type2[Type2["CodeBlock"] = 2] = "CodeBlock";
  Type2[Type2["FencedCode"] = 3] = "FencedCode";
  Type2[Type2["Blockquote"] = 4] = "Blockquote";
  Type2[Type2["HorizontalRule"] = 5] = "HorizontalRule";
  Type2[Type2["BulletList"] = 6] = "BulletList";
  Type2[Type2["OrderedList"] = 7] = "OrderedList";
  Type2[Type2["ListItem"] = 8] = "ListItem";
  Type2[Type2["ATXHeading1"] = 9] = "ATXHeading1";
  Type2[Type2["ATXHeading2"] = 10] = "ATXHeading2";
  Type2[Type2["ATXHeading3"] = 11] = "ATXHeading3";
  Type2[Type2["ATXHeading4"] = 12] = "ATXHeading4";
  Type2[Type2["ATXHeading5"] = 13] = "ATXHeading5";
  Type2[Type2["ATXHeading6"] = 14] = "ATXHeading6";
  Type2[Type2["SetextHeading1"] = 15] = "SetextHeading1";
  Type2[Type2["SetextHeading2"] = 16] = "SetextHeading2";
  Type2[Type2["HTMLBlock"] = 17] = "HTMLBlock";
  Type2[Type2["LinkReference"] = 18] = "LinkReference";
  Type2[Type2["Paragraph"] = 19] = "Paragraph";
  Type2[Type2["CommentBlock"] = 20] = "CommentBlock";
  Type2[Type2["ProcessingInstructionBlock"] = 21] = "ProcessingInstructionBlock";
  Type2[Type2["Escape"] = 22] = "Escape";
  Type2[Type2["Entity"] = 23] = "Entity";
  Type2[Type2["HardBreak"] = 24] = "HardBreak";
  Type2[Type2["Emphasis"] = 25] = "Emphasis";
  Type2[Type2["StrongEmphasis"] = 26] = "StrongEmphasis";
  Type2[Type2["Link"] = 27] = "Link";
  Type2[Type2["Image"] = 28] = "Image";
  Type2[Type2["InlineCode"] = 29] = "InlineCode";
  Type2[Type2["HTMLTag"] = 30] = "HTMLTag";
  Type2[Type2["Comment"] = 31] = "Comment";
  Type2[Type2["ProcessingInstruction"] = 32] = "ProcessingInstruction";
  Type2[Type2["Autolink"] = 33] = "Autolink";
  Type2[Type2["HeaderMark"] = 34] = "HeaderMark";
  Type2[Type2["QuoteMark"] = 35] = "QuoteMark";
  Type2[Type2["ListMark"] = 36] = "ListMark";
  Type2[Type2["LinkMark"] = 37] = "LinkMark";
  Type2[Type2["EmphasisMark"] = 38] = "EmphasisMark";
  Type2[Type2["CodeMark"] = 39] = "CodeMark";
  Type2[Type2["CodeText"] = 40] = "CodeText";
  Type2[Type2["CodeInfo"] = 41] = "CodeInfo";
  Type2[Type2["LinkTitle"] = 42] = "LinkTitle";
  Type2[Type2["LinkLabel"] = 43] = "LinkLabel";
  Type2[Type2["URL"] = 44] = "URL";
})(Type || (Type = {}));
var LeafBlock = class {
  /**
  @internal
  */
  constructor(start, content2) {
    this.start = start;
    this.content = content2;
    this.marks = [];
    this.parsers = [];
  }
};
var Line = class {
  constructor() {
    this.text = "";
    this.baseIndent = 0;
    this.basePos = 0;
    this.depth = 0;
    this.markers = [];
    this.pos = 0;
    this.indent = 0;
    this.next = -1;
  }
  /**
  @internal
  */
  forward() {
    if (this.basePos > this.pos)
      this.forwardInner();
  }
  /**
  @internal
  */
  forwardInner() {
    let newPos = this.skipSpace(this.basePos);
    this.indent = this.countIndent(newPos, this.pos, this.indent);
    this.pos = newPos;
    this.next = newPos == this.text.length ? -1 : this.text.charCodeAt(newPos);
  }
  /**
  Skip whitespace after the given position, return the position of
  the next non-space character or the end of the line if there's
  only space after `from`.
  */
  skipSpace(from) {
    return skipSpace(this.text, from);
  }
  /**
  @internal
  */
  reset(text) {
    this.text = text;
    this.baseIndent = this.basePos = this.pos = this.indent = 0;
    this.forwardInner();
    this.depth = 1;
    while (this.markers.length)
      this.markers.pop();
  }
  /**
  Move the line's base position forward to the given position.
  This should only be called by composite [block
  parsers](#BlockParser.parse) or [markup skipping
  functions](#NodeSpec.composite).
  */
  moveBase(to) {
    this.basePos = to;
    this.baseIndent = this.countIndent(to, this.pos, this.indent);
  }
  /**
  Move the line's base position forward to the given _column_.
  */
  moveBaseColumn(indent) {
    this.baseIndent = indent;
    this.basePos = this.findColumn(indent);
  }
  /**
  Store a composite-block-level marker. Should be called from
  [markup skipping functions](#NodeSpec.composite) when they
  consume any non-whitespace characters.
  */
  addMarker(elt2) {
    this.markers.push(elt2);
  }
  /**
  Find the column position at `to`, optionally starting at a given
  position and column.
  */
  countIndent(to, from = 0, indent = 0) {
    for (let i = from; i < to; i++)
      indent += this.text.charCodeAt(i) == 9 ? 4 - indent % 4 : 1;
    return indent;
  }
  /**
  Find the position corresponding to the given column.
  */
  findColumn(goal) {
    let i = 0;
    for (let indent = 0; i < this.text.length && indent < goal; i++)
      indent += this.text.charCodeAt(i) == 9 ? 4 - indent % 4 : 1;
    return i;
  }
  /**
  @internal
  */
  scrub() {
    if (!this.baseIndent)
      return this.text;
    let result = "";
    for (let i = 0; i < this.basePos; i++)
      result += " ";
    return result + this.text.slice(this.basePos);
  }
};
function skipForList(bl, cx, line) {
  if (line.pos == line.text.length || bl != cx.block && line.indent >= cx.stack[line.depth + 1].value + line.baseIndent)
    return true;
  if (line.indent >= line.baseIndent + 4)
    return false;
  let size = (bl.type == Type.OrderedList ? isOrderedList : isBulletList)(line, cx, false);
  return size > 0 && (bl.type != Type.BulletList || isHorizontalRule(line, cx, false) < 0) && line.text.charCodeAt(line.pos + size - 1) == bl.value;
}
var DefaultSkipMarkup = {
  [Type.Blockquote](bl, cx, line) {
    if (line.next != 62)
      return false;
    line.markers.push(elt(Type.QuoteMark, cx.lineStart + line.pos, cx.lineStart + line.pos + 1));
    line.moveBase(line.pos + (space(line.text.charCodeAt(line.pos + 1)) ? 2 : 1));
    bl.end = cx.lineStart + line.text.length;
    return true;
  },
  [Type.ListItem](bl, _cx, line) {
    if (line.indent < line.baseIndent + bl.value && line.next > -1)
      return false;
    line.moveBaseColumn(line.baseIndent + bl.value);
    return true;
  },
  [Type.OrderedList]: skipForList,
  [Type.BulletList]: skipForList,
  [Type.Document]() {
    return true;
  }
};
function space(ch) {
  return ch == 32 || ch == 9 || ch == 10 || ch == 13;
}
function skipSpace(line, i = 0) {
  while (i < line.length && space(line.charCodeAt(i)))
    i++;
  return i;
}
function skipSpaceBack(line, i, to) {
  while (i > to && space(line.charCodeAt(i - 1)))
    i--;
  return i;
}
function isFencedCode(line) {
  if (line.next != 96 && line.next != 126)
    return -1;
  let pos = line.pos + 1;
  while (pos < line.text.length && line.text.charCodeAt(pos) == line.next)
    pos++;
  if (pos < line.pos + 3)
    return -1;
  if (line.next == 96) {
    for (let i = pos; i < line.text.length; i++)
      if (line.text.charCodeAt(i) == 96)
        return -1;
  }
  return pos;
}
function isBlockquote(line) {
  return line.next != 62 ? -1 : line.text.charCodeAt(line.pos + 1) == 32 ? 2 : 1;
}
function isHorizontalRule(line, cx, breaking) {
  if (line.next != 42 && line.next != 45 && line.next != 95)
    return -1;
  let count2 = 1;
  for (let pos = line.pos + 1; pos < line.text.length; pos++) {
    let ch = line.text.charCodeAt(pos);
    if (ch == line.next)
      count2++;
    else if (!space(ch))
      return -1;
  }
  if (breaking && line.next == 45 && isSetextUnderline(line) > -1 && line.depth == cx.stack.length && cx.parser.leafBlockParsers.indexOf(DefaultLeafBlocks.SetextHeading) > -1)
    return -1;
  return count2 < 3 ? -1 : 1;
}
function inList(cx, type) {
  for (let i = cx.stack.length - 1; i >= 0; i--)
    if (cx.stack[i].type == type)
      return true;
  return false;
}
function isBulletList(line, cx, breaking) {
  return (line.next == 45 || line.next == 43 || line.next == 42) && (line.pos == line.text.length - 1 || space(line.text.charCodeAt(line.pos + 1))) && (!breaking || inList(cx, Type.BulletList) || line.skipSpace(line.pos + 2) < line.text.length) ? 1 : -1;
}
function isOrderedList(line, cx, breaking) {
  let pos = line.pos, next = line.next;
  for (; ; ) {
    if (next >= 48 && next <= 57)
      pos++;
    else
      break;
    if (pos == line.text.length)
      return -1;
    next = line.text.charCodeAt(pos);
  }
  if (pos == line.pos || pos > line.pos + 9 || next != 46 && next != 41 || pos < line.text.length - 1 && !space(line.text.charCodeAt(pos + 1)) || breaking && !inList(cx, Type.OrderedList) && (line.skipSpace(pos + 1) == line.text.length || pos > line.pos + 1 || line.next != 49))
    return -1;
  return pos + 1 - line.pos;
}
function isAtxHeading(line) {
  if (line.next != 35)
    return -1;
  let pos = line.pos + 1;
  while (pos < line.text.length && line.text.charCodeAt(pos) == 35)
    pos++;
  if (pos < line.text.length && line.text.charCodeAt(pos) != 32)
    return -1;
  let size = pos - line.pos;
  return size > 6 ? -1 : size;
}
function isSetextUnderline(line) {
  if (line.next != 45 && line.next != 61 || line.indent >= line.baseIndent + 4)
    return -1;
  let pos = line.pos + 1;
  while (pos < line.text.length && line.text.charCodeAt(pos) == line.next)
    pos++;
  let end = pos;
  while (pos < line.text.length && space(line.text.charCodeAt(pos)))
    pos++;
  return pos == line.text.length ? end : -1;
}
var EmptyLine = /^[ \t]*$/;
var CommentEnd = /-->/;
var ProcessingEnd = /\?>/;
var HTMLBlockStyle = [
  [/^<(?:script|pre|style)(?:\s|>|$)/i, /<\/(?:script|pre|style)>/i],
  [/^\s*<!--/, CommentEnd],
  [/^\s*<\?/, ProcessingEnd],
  [/^\s*<![A-Z]/, />/],
  [/^\s*<!\[CDATA\[/, /\]\]>/],
  [/^\s*<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:\s|\/?>|$)/i, EmptyLine],
  [/^\s*(?:<\/[a-z][\w-]*\s*>|<[a-z][\w-]*(\s+[a-z:_][\w-.]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*>)\s*$/i, EmptyLine]
];
function isHTMLBlock(line, _cx, breaking) {
  if (line.next != 60)
    return -1;
  let rest = line.text.slice(line.pos);
  for (let i = 0, e = HTMLBlockStyle.length - (breaking ? 1 : 0); i < e; i++)
    if (HTMLBlockStyle[i][0].test(rest))
      return i;
  return -1;
}
function getListIndent(line, pos) {
  let indentAfter = line.countIndent(pos, line.pos, line.indent);
  let skipped = line.skipSpace(pos);
  let indented = line.countIndent(skipped, pos, indentAfter);
  return indented >= indentAfter + 5 || skipped == line.text.length ? indentAfter + 1 : indented;
}
function addCodeText(marks, from, to) {
  let last = marks.length - 1;
  if (last >= 0 && marks[last].to == from && marks[last].type == Type.CodeText)
    marks[last].to = to;
  else
    marks.push(elt(Type.CodeText, from, to));
}
var DefaultBlockParsers = {
  LinkReference: void 0,
  IndentedCode(cx, line) {
    let base = line.baseIndent + 4;
    if (line.indent < base)
      return false;
    let start = line.findColumn(base);
    let from = cx.lineStart + start, to = cx.lineStart + line.text.length;
    let marks = [], pendingMarks = [];
    addCodeText(marks, from, to);
    while (cx.nextLine() && line.depth >= cx.stack.length) {
      if (line.pos == line.text.length) {
        addCodeText(pendingMarks, cx.lineStart - 1, cx.lineStart);
        for (let m of line.markers)
          pendingMarks.push(m);
      } else if (line.indent < base) {
        break;
      } else {
        if (pendingMarks.length) {
          for (let m of pendingMarks) {
            if (m.type == Type.CodeText)
              addCodeText(marks, m.from, m.to);
            else
              marks.push(m);
          }
          pendingMarks = [];
        }
        addCodeText(marks, cx.lineStart - 1, cx.lineStart);
        for (let m of line.markers)
          marks.push(m);
        to = cx.lineStart + line.text.length;
        let codeStart = cx.lineStart + line.findColumn(line.baseIndent + 4);
        if (codeStart < to)
          addCodeText(marks, codeStart, to);
      }
    }
    if (pendingMarks.length) {
      pendingMarks = pendingMarks.filter((m) => m.type != Type.CodeText);
      if (pendingMarks.length)
        line.markers = pendingMarks.concat(line.markers);
    }
    cx.addNode(cx.buffer.writeElements(marks, -from).finish(Type.CodeBlock, to - from), from);
    return true;
  },
  FencedCode(cx, line) {
    let fenceEnd = isFencedCode(line);
    if (fenceEnd < 0)
      return false;
    let from = cx.lineStart + line.pos, ch = line.next, len = fenceEnd - line.pos;
    let infoFrom = line.skipSpace(fenceEnd), infoTo = skipSpaceBack(line.text, line.text.length, infoFrom);
    let marks = [elt(Type.CodeMark, from, from + len)];
    if (infoFrom < infoTo)
      marks.push(elt(Type.CodeInfo, cx.lineStart + infoFrom, cx.lineStart + infoTo));
    for (let first = true, empty = true, hasLine = false; cx.nextLine() && line.depth >= cx.stack.length; first = false) {
      let i = line.pos;
      if (line.indent - line.baseIndent < 4)
        while (i < line.text.length && line.text.charCodeAt(i) == ch)
          i++;
      if (i - line.pos >= len && line.skipSpace(i) == line.text.length) {
        for (let m of line.markers)
          marks.push(m);
        if (empty && hasLine)
          addCodeText(marks, cx.lineStart - 1, cx.lineStart);
        marks.push(elt(Type.CodeMark, cx.lineStart + line.pos, cx.lineStart + i));
        cx.nextLine();
        break;
      } else {
        hasLine = true;
        if (!first) {
          addCodeText(marks, cx.lineStart - 1, cx.lineStart);
          empty = false;
        }
        for (let m of line.markers)
          marks.push(m);
        let textStart = cx.lineStart + line.basePos, textEnd = cx.lineStart + line.text.length;
        if (textStart < textEnd) {
          addCodeText(marks, textStart, textEnd);
          empty = false;
        }
      }
    }
    cx.addNode(cx.buffer.writeElements(marks, -from).finish(Type.FencedCode, cx.prevLineEnd() - from), from);
    return true;
  },
  Blockquote(cx, line) {
    let size = isBlockquote(line);
    if (size < 0)
      return false;
    cx.startContext(Type.Blockquote, line.pos);
    cx.addNode(Type.QuoteMark, cx.lineStart + line.pos, cx.lineStart + line.pos + 1);
    line.moveBase(line.pos + size);
    return null;
  },
  HorizontalRule(cx, line) {
    if (isHorizontalRule(line, cx, false) < 0)
      return false;
    let from = cx.lineStart + line.pos;
    cx.nextLine();
    cx.addNode(Type.HorizontalRule, from);
    return true;
  },
  BulletList(cx, line) {
    let size = isBulletList(line, cx, false);
    if (size < 0)
      return false;
    if (cx.block.type != Type.BulletList)
      cx.startContext(Type.BulletList, line.basePos, line.next);
    let newBase = getListIndent(line, line.pos + 1);
    cx.startContext(Type.ListItem, line.basePos, newBase - line.baseIndent);
    cx.addNode(Type.ListMark, cx.lineStart + line.pos, cx.lineStart + line.pos + size);
    line.moveBaseColumn(newBase);
    return null;
  },
  OrderedList(cx, line) {
    let size = isOrderedList(line, cx, false);
    if (size < 0)
      return false;
    if (cx.block.type != Type.OrderedList)
      cx.startContext(Type.OrderedList, line.basePos, line.text.charCodeAt(line.pos + size - 1));
    let newBase = getListIndent(line, line.pos + size);
    cx.startContext(Type.ListItem, line.basePos, newBase - line.baseIndent);
    cx.addNode(Type.ListMark, cx.lineStart + line.pos, cx.lineStart + line.pos + size);
    line.moveBaseColumn(newBase);
    return null;
  },
  ATXHeading(cx, line) {
    let size = isAtxHeading(line);
    if (size < 0)
      return false;
    let off = line.pos, from = cx.lineStart + off;
    let endOfSpace = skipSpaceBack(line.text, line.text.length, off), after = endOfSpace;
    while (after > off && line.text.charCodeAt(after - 1) == line.next)
      after--;
    if (after == endOfSpace || after == off || !space(line.text.charCodeAt(after - 1)))
      after = line.text.length;
    let buf = cx.buffer.write(Type.HeaderMark, 0, size).writeElements(cx.parser.parseInline(line.text.slice(off + size + 1, after), from + size + 1), -from);
    if (after < line.text.length)
      buf.write(Type.HeaderMark, after - off, endOfSpace - off);
    let node = buf.finish(Type.ATXHeading1 - 1 + size, line.text.length - off);
    cx.nextLine();
    cx.addNode(node, from);
    return true;
  },
  HTMLBlock(cx, line) {
    let type = isHTMLBlock(line, cx, false);
    if (type < 0)
      return false;
    let from = cx.lineStart + line.pos, end = HTMLBlockStyle[type][1];
    let marks = [], trailing = end != EmptyLine;
    while (!end.test(line.text) && cx.nextLine()) {
      if (line.depth < cx.stack.length) {
        trailing = false;
        break;
      }
      for (let m of line.markers)
        marks.push(m);
    }
    if (trailing)
      cx.nextLine();
    let nodeType = end == CommentEnd ? Type.CommentBlock : end == ProcessingEnd ? Type.ProcessingInstructionBlock : Type.HTMLBlock;
    let to = cx.prevLineEnd();
    cx.addNode(cx.buffer.writeElements(marks, -from).finish(nodeType, to - from), from);
    return true;
  },
  SetextHeading: void 0
  // Specifies relative precedence for block-continue function
};
var LinkReferenceParser = class {
  constructor(leaf) {
    this.stage = 0;
    this.elts = [];
    this.pos = 0;
    this.start = leaf.start;
    this.advance(leaf.content);
  }
  nextLine(cx, line, leaf) {
    if (this.stage == -1)
      return false;
    let content2 = leaf.content + "\n" + line.scrub();
    let finish = this.advance(content2);
    if (finish > -1 && finish < content2.length)
      return this.complete(cx, leaf, finish);
    return false;
  }
  finish(cx, leaf) {
    if ((this.stage == 2 || this.stage == 3) && skipSpace(leaf.content, this.pos) == leaf.content.length)
      return this.complete(cx, leaf, leaf.content.length);
    return false;
  }
  complete(cx, leaf, len) {
    cx.addLeafElement(leaf, elt(Type.LinkReference, this.start, this.start + len, this.elts));
    return true;
  }
  nextStage(elt2) {
    if (elt2) {
      this.pos = elt2.to - this.start;
      this.elts.push(elt2);
      this.stage++;
      return true;
    }
    if (elt2 === false)
      this.stage = -1;
    return false;
  }
  advance(content2) {
    for (; ; ) {
      if (this.stage == -1) {
        return -1;
      } else if (this.stage == 0) {
        if (!this.nextStage(parseLinkLabel(content2, this.pos, this.start, true)))
          return -1;
        if (content2.charCodeAt(this.pos) != 58)
          return this.stage = -1;
        this.elts.push(elt(Type.LinkMark, this.pos + this.start, this.pos + this.start + 1));
        this.pos++;
      } else if (this.stage == 1) {
        if (!this.nextStage(parseURL(content2, skipSpace(content2, this.pos), this.start)))
          return -1;
      } else if (this.stage == 2) {
        let skip = skipSpace(content2, this.pos), end = 0;
        if (skip > this.pos) {
          let title = parseLinkTitle(content2, skip, this.start);
          if (title) {
            let titleEnd = lineEnd(content2, title.to - this.start);
            if (titleEnd > 0) {
              this.nextStage(title);
              end = titleEnd;
            }
          }
        }
        if (!end)
          end = lineEnd(content2, this.pos);
        return end > 0 && end < content2.length ? end : -1;
      } else {
        return lineEnd(content2, this.pos);
      }
    }
  }
};
function lineEnd(text, pos) {
  for (; pos < text.length; pos++) {
    let next = text.charCodeAt(pos);
    if (next == 10)
      break;
    if (!space(next))
      return -1;
  }
  return pos;
}
var SetextHeadingParser = class {
  nextLine(cx, line, leaf) {
    let underline = line.depth < cx.stack.length ? -1 : isSetextUnderline(line);
    let next = line.next;
    if (underline < 0)
      return false;
    let underlineMark = elt(Type.HeaderMark, cx.lineStart + line.pos, cx.lineStart + underline);
    cx.nextLine();
    cx.addLeafElement(leaf, elt(next == 61 ? Type.SetextHeading1 : Type.SetextHeading2, leaf.start, cx.prevLineEnd(), [
      ...cx.parser.parseInline(leaf.content, leaf.start),
      underlineMark
    ]));
    return true;
  }
  finish() {
    return false;
  }
};
var DefaultLeafBlocks = {
  LinkReference(_, leaf) {
    return leaf.content.charCodeAt(0) == 91 ? new LinkReferenceParser(leaf) : null;
  },
  SetextHeading() {
    return new SetextHeadingParser();
  }
};
var DefaultEndLeaf = [
  (_, line) => isAtxHeading(line) >= 0,
  (_, line) => isFencedCode(line) >= 0,
  (_, line) => isBlockquote(line) >= 0,
  (p, line) => isBulletList(line, p, true) >= 0,
  (p, line) => isOrderedList(line, p, true) >= 0,
  (p, line) => isHorizontalRule(line, p, true) >= 0,
  (p, line) => isHTMLBlock(line, p, true) >= 0
];
var scanLineResult = { text: "", end: 0 };
var BlockContext = class {
  /**
  @internal
  */
  constructor(parser2, input, fragments, ranges) {
    this.parser = parser2;
    this.input = input;
    this.ranges = ranges;
    this.line = new Line();
    this.atEnd = false;
    this.reusePlaceholders = /* @__PURE__ */ new Map();
    this.stoppedAt = null;
    this.rangeI = 0;
    this.to = ranges[ranges.length - 1].to;
    this.lineStart = this.absoluteLineStart = this.absoluteLineEnd = ranges[0].from;
    this.block = CompositeBlock.create(Type.Document, 0, this.lineStart, 0, 0);
    this.stack = [this.block];
    this.fragments = fragments.length ? new FragmentCursor(fragments, input) : null;
    this.readLine();
  }
  get parsedPos() {
    return this.absoluteLineStart;
  }
  advance() {
    if (this.stoppedAt != null && this.absoluteLineStart > this.stoppedAt)
      return this.finish();
    let { line } = this;
    for (; ; ) {
      for (let markI = 0; ; ) {
        let next = line.depth < this.stack.length ? this.stack[this.stack.length - 1] : null;
        while (markI < line.markers.length && (!next || line.markers[markI].from < next.end)) {
          let mark = line.markers[markI++];
          this.addNode(mark.type, mark.from, mark.to);
        }
        if (!next)
          break;
        this.finishContext();
      }
      if (line.pos < line.text.length)
        break;
      if (!this.nextLine())
        return this.finish();
    }
    if (this.fragments && this.reuseFragment(line.basePos))
      return null;
    start: for (; ; ) {
      for (let type of this.parser.blockParsers)
        if (type) {
          let result = type(this, line);
          if (result != false) {
            if (result == true)
              return null;
            line.forward();
            continue start;
          }
        }
      break;
    }
    if (line.pos == line.text.length)
      return this.nextLine() ? null : this.finish();
    let leaf = new LeafBlock(this.lineStart + line.pos, line.text.slice(line.pos));
    for (let parse of this.parser.leafBlockParsers)
      if (parse) {
        let parser2 = parse(this, leaf);
        if (parser2)
          leaf.parsers.push(parser2);
      }
    lines: while (this.nextLine()) {
      if (line.pos == line.text.length)
        break;
      if (line.indent < line.baseIndent + 4) {
        for (let stop of this.parser.endLeafBlock)
          if (stop(this, line, leaf))
            break lines;
      }
      for (let parser2 of leaf.parsers)
        if (parser2.nextLine(this, line, leaf))
          return null;
      leaf.content += "\n" + line.scrub();
      for (let m of line.markers)
        leaf.marks.push(m);
    }
    this.finishLeaf(leaf);
    return null;
  }
  stopAt(pos) {
    if (this.stoppedAt != null && this.stoppedAt < pos)
      throw new RangeError("Can't move stoppedAt forward");
    this.stoppedAt = pos;
  }
  reuseFragment(start) {
    if (!this.fragments.moveTo(this.absoluteLineStart + start, this.absoluteLineStart) || !this.fragments.matches(this.block.hash))
      return false;
    let taken = this.fragments.takeNodes(this);
    if (!taken)
      return false;
    this.absoluteLineStart += taken;
    this.lineStart = toRelative(this.absoluteLineStart, this.ranges);
    this.moveRangeI();
    if (this.absoluteLineStart < this.to) {
      this.lineStart++;
      this.absoluteLineStart++;
      this.readLine();
    } else {
      this.atEnd = true;
      this.readLine();
    }
    return true;
  }
  /**
  The number of parent blocks surrounding the current block.
  */
  get depth() {
    return this.stack.length;
  }
  /**
  Get the type of the parent block at the given depth. When no
  depth is passed, return the type of the innermost parent.
  */
  parentType(depth = this.depth - 1) {
    return this.parser.nodeSet.types[this.stack[depth].type];
  }
  /**
  Move to the next input line. This should only be called by
  (non-composite) [block parsers](#BlockParser.parse) that consume
  the line directly, or leaf block parser
  [`nextLine`](#LeafBlockParser.nextLine) methods when they
  consume the current line (and return true).
  */
  nextLine() {
    this.lineStart += this.line.text.length;
    if (this.absoluteLineEnd >= this.to) {
      this.absoluteLineStart = this.absoluteLineEnd;
      this.atEnd = true;
      this.readLine();
      return false;
    } else {
      this.lineStart++;
      this.absoluteLineStart = this.absoluteLineEnd + 1;
      this.moveRangeI();
      this.readLine();
      return true;
    }
  }
  /**
  Retrieve the text of the line after the current one, without
  actually moving the context's current line forward.
  */
  peekLine() {
    return this.scanLine(this.absoluteLineEnd + 1).text;
  }
  moveRangeI() {
    while (this.rangeI < this.ranges.length - 1 && this.absoluteLineStart >= this.ranges[this.rangeI].to) {
      this.rangeI++;
      this.absoluteLineStart = Math.max(this.absoluteLineStart, this.ranges[this.rangeI].from);
    }
  }
  /**
  @internal
  Collect the text for the next line.
  */
  scanLine(start) {
    let r = scanLineResult;
    r.end = start;
    if (start >= this.to) {
      r.text = "";
    } else {
      r.text = this.lineChunkAt(start);
      r.end += r.text.length;
      if (this.ranges.length > 1) {
        let textOffset = this.absoluteLineStart, rangeI = this.rangeI;
        while (this.ranges[rangeI].to < r.end) {
          rangeI++;
          let nextFrom = this.ranges[rangeI].from;
          let after = this.lineChunkAt(nextFrom);
          r.end = nextFrom + after.length;
          r.text = r.text.slice(0, this.ranges[rangeI - 1].to - textOffset) + after;
          textOffset = r.end - r.text.length;
        }
      }
    }
    return r;
  }
  /**
  @internal
  Populate this.line with the content of the next line. Skip
  leading characters covered by composite blocks.
  */
  readLine() {
    let { line } = this, { text, end } = this.scanLine(this.absoluteLineStart);
    this.absoluteLineEnd = end;
    line.reset(text);
    for (; line.depth < this.stack.length; line.depth++) {
      let cx = this.stack[line.depth], handler = this.parser.skipContextMarkup[cx.type];
      if (!handler)
        throw new Error("Unhandled block context " + Type[cx.type]);
      let marks = this.line.markers.length;
      if (!handler(cx, this, line)) {
        if (this.line.markers.length > marks)
          cx.end = this.line.markers[this.line.markers.length - 1].to;
        line.forward();
        break;
      }
      line.forward();
    }
  }
  lineChunkAt(pos) {
    let next = this.input.chunk(pos), text;
    if (!this.input.lineChunks) {
      let eol = next.indexOf("\n");
      text = eol < 0 ? next : next.slice(0, eol);
    } else {
      text = next == "\n" ? "" : next;
    }
    return pos + text.length > this.to ? text.slice(0, this.to - pos) : text;
  }
  /**
  The end position of the previous line.
  */
  prevLineEnd() {
    return this.atEnd ? this.lineStart : this.lineStart - 1;
  }
  /**
  @internal
  */
  startContext(type, start, value = 0) {
    this.block = CompositeBlock.create(type, value, this.lineStart + start, this.block.hash, this.lineStart + this.line.text.length);
    this.stack.push(this.block);
  }
  /**
  Start a composite block. Should only be called from [block
  parser functions](#BlockParser.parse) that return null.
  */
  startComposite(type, start, value = 0) {
    this.startContext(this.parser.getNodeType(type), start, value);
  }
  /**
  @internal
  */
  addNode(block, from, to) {
    if (typeof block == "number")
      block = new Tree(this.parser.nodeSet.types[block], none, none, (to !== null && to !== void 0 ? to : this.prevLineEnd()) - from);
    this.block.addChild(block, from - this.block.from);
  }
  /**
  Add a block element. Can be called by [block
  parsers](#BlockParser.parse).
  */
  addElement(elt2) {
    this.block.addChild(elt2.toTree(this.parser.nodeSet), elt2.from - this.block.from);
  }
  /**
  Add a block element from a [leaf parser](#LeafBlockParser). This
  makes sure any extra composite block markup (such as blockquote
  markers) inside the block are also added to the syntax tree.
  */
  addLeafElement(leaf, elt2) {
    this.addNode(this.buffer.writeElements(injectMarks(elt2.children, leaf.marks), -elt2.from).finish(elt2.type, elt2.to - elt2.from), elt2.from);
  }
  /**
  @internal
  */
  finishContext() {
    let cx = this.stack.pop();
    let top = this.stack[this.stack.length - 1];
    top.addChild(cx.toTree(this.parser.nodeSet), cx.from - top.from);
    this.block = top;
  }
  finish() {
    while (this.stack.length > 1)
      this.finishContext();
    return this.addGaps(this.block.toTree(this.parser.nodeSet, this.lineStart));
  }
  addGaps(tree) {
    return this.ranges.length > 1 ? injectGaps(this.ranges, 0, tree.topNode, this.ranges[0].from, this.reusePlaceholders) : tree;
  }
  /**
  @internal
  */
  finishLeaf(leaf) {
    for (let parser2 of leaf.parsers)
      if (parser2.finish(this, leaf))
        return;
    let inline = injectMarks(this.parser.parseInline(leaf.content, leaf.start), leaf.marks);
    this.addNode(this.buffer.writeElements(inline, -leaf.start).finish(Type.Paragraph, leaf.content.length), leaf.start);
  }
  elt(type, from, to, children) {
    if (typeof type == "string")
      return elt(this.parser.getNodeType(type), from, to, children);
    return new TreeElement(type, from);
  }
  /**
  @internal
  */
  get buffer() {
    return new Buffer2(this.parser.nodeSet);
  }
};
function injectGaps(ranges, rangeI, tree, offset, dummies) {
  let rangeEnd = ranges[rangeI].to;
  let children = [], positions = [], start = tree.from + offset;
  function movePastNext(upto, inclusive) {
    while (inclusive ? upto >= rangeEnd : upto > rangeEnd) {
      let size = ranges[rangeI + 1].from - rangeEnd;
      offset += size;
      upto += size;
      rangeI++;
      rangeEnd = ranges[rangeI].to;
    }
  }
  for (let ch = tree.firstChild; ch; ch = ch.nextSibling) {
    movePastNext(ch.from + offset, true);
    let from = ch.from + offset, node, reuse = dummies.get(ch.tree);
    if (reuse) {
      node = reuse;
    } else if (ch.to + offset > rangeEnd) {
      node = injectGaps(ranges, rangeI, ch, offset, dummies);
      movePastNext(ch.to + offset, false);
    } else {
      node = ch.toTree();
    }
    children.push(node);
    positions.push(from - start);
  }
  movePastNext(tree.to + offset, false);
  return new Tree(tree.type, children, positions, tree.to + offset - start, tree.tree ? tree.tree.propValues : void 0);
}
var MarkdownParser = class _MarkdownParser extends Parser {
  /**
  @internal
  */
  constructor(nodeSet, blockParsers, leafBlockParsers, blockNames, endLeafBlock, skipContextMarkup, inlineParsers, inlineNames, wrappers) {
    super();
    this.nodeSet = nodeSet;
    this.blockParsers = blockParsers;
    this.leafBlockParsers = leafBlockParsers;
    this.blockNames = blockNames;
    this.endLeafBlock = endLeafBlock;
    this.skipContextMarkup = skipContextMarkup;
    this.inlineParsers = inlineParsers;
    this.inlineNames = inlineNames;
    this.wrappers = wrappers;
    this.nodeTypes = /* @__PURE__ */ Object.create(null);
    for (let t2 of nodeSet.types)
      this.nodeTypes[t2.name] = t2.id;
  }
  createParse(input, fragments, ranges) {
    let parse = new BlockContext(this, input, fragments, ranges);
    for (let w of this.wrappers)
      parse = w(parse, input, fragments, ranges);
    return parse;
  }
  /**
  Reconfigure the parser.
  */
  configure(spec) {
    let config = resolveConfig(spec);
    if (!config)
      return this;
    let { nodeSet, skipContextMarkup } = this;
    let blockParsers = this.blockParsers.slice(), leafBlockParsers = this.leafBlockParsers.slice(), blockNames = this.blockNames.slice(), inlineParsers = this.inlineParsers.slice(), inlineNames = this.inlineNames.slice(), endLeafBlock = this.endLeafBlock.slice(), wrappers = this.wrappers;
    if (nonEmpty(config.defineNodes)) {
      skipContextMarkup = Object.assign({}, skipContextMarkup);
      let nodeTypes2 = nodeSet.types.slice(), styles;
      for (let s of config.defineNodes) {
        let { name: name2, block, composite, style } = typeof s == "string" ? { name: s } : s;
        if (nodeTypes2.some((t2) => t2.name == name2))
          continue;
        if (composite)
          skipContextMarkup[nodeTypes2.length] = (bl, cx, line) => composite(cx, line, bl.value);
        let id = nodeTypes2.length;
        let group = composite ? ["Block", "BlockContext"] : !block ? void 0 : id >= Type.ATXHeading1 && id <= Type.SetextHeading2 ? ["Block", "LeafBlock", "Heading"] : ["Block", "LeafBlock"];
        nodeTypes2.push(NodeType.define({
          id,
          name: name2,
          props: group && [[NodeProp.group, group]]
        }));
        if (style) {
          if (!styles)
            styles = {};
          if (Array.isArray(style) || style instanceof Tag)
            styles[name2] = style;
          else
            Object.assign(styles, style);
        }
      }
      nodeSet = new NodeSet(nodeTypes2);
      if (styles)
        nodeSet = nodeSet.extend(styleTags(styles));
    }
    if (nonEmpty(config.props))
      nodeSet = nodeSet.extend(...config.props);
    if (nonEmpty(config.remove)) {
      for (let rm of config.remove) {
        let block = this.blockNames.indexOf(rm), inline = this.inlineNames.indexOf(rm);
        if (block > -1)
          blockParsers[block] = leafBlockParsers[block] = void 0;
        if (inline > -1)
          inlineParsers[inline] = void 0;
      }
    }
    if (nonEmpty(config.parseBlock)) {
      for (let spec2 of config.parseBlock) {
        let found = blockNames.indexOf(spec2.name);
        if (found > -1) {
          blockParsers[found] = spec2.parse;
          leafBlockParsers[found] = spec2.leaf;
        } else {
          let pos = spec2.before ? findName(blockNames, spec2.before) : spec2.after ? findName(blockNames, spec2.after) + 1 : blockNames.length - 1;
          blockParsers.splice(pos, 0, spec2.parse);
          leafBlockParsers.splice(pos, 0, spec2.leaf);
          blockNames.splice(pos, 0, spec2.name);
        }
        if (spec2.endLeaf)
          endLeafBlock.push(spec2.endLeaf);
      }
    }
    if (nonEmpty(config.parseInline)) {
      for (let spec2 of config.parseInline) {
        let found = inlineNames.indexOf(spec2.name);
        if (found > -1) {
          inlineParsers[found] = spec2.parse;
        } else {
          let pos = spec2.before ? findName(inlineNames, spec2.before) : spec2.after ? findName(inlineNames, spec2.after) + 1 : inlineNames.length - 1;
          inlineParsers.splice(pos, 0, spec2.parse);
          inlineNames.splice(pos, 0, spec2.name);
        }
      }
    }
    if (config.wrap)
      wrappers = wrappers.concat(config.wrap);
    return new _MarkdownParser(nodeSet, blockParsers, leafBlockParsers, blockNames, endLeafBlock, skipContextMarkup, inlineParsers, inlineNames, wrappers);
  }
  /**
  @internal
  */
  getNodeType(name2) {
    let found = this.nodeTypes[name2];
    if (found == null)
      throw new RangeError(`Unknown node type '${name2}'`);
    return found;
  }
  /**
  Parse the given piece of inline text at the given offset,
  returning an array of [`Element`](#Element) objects representing
  the inline content.
  */
  parseInline(text, offset) {
    let cx = new InlineContext(this, text, offset);
    outer: for (let pos = offset; pos < cx.end; ) {
      let next = cx.char(pos);
      for (let token of this.inlineParsers)
        if (token) {
          let result = token(cx, next, pos);
          if (result >= 0) {
            pos = result;
            continue outer;
          }
        }
      pos++;
    }
    return cx.resolveMarkers(0);
  }
};
function nonEmpty(a) {
  return a != null && a.length > 0;
}
function resolveConfig(spec) {
  if (!Array.isArray(spec))
    return spec;
  if (spec.length == 0)
    return null;
  let conf = resolveConfig(spec[0]);
  if (spec.length == 1)
    return conf;
  let rest = resolveConfig(spec.slice(1));
  if (!rest || !conf)
    return conf || rest;
  let conc = (a, b) => (a || none).concat(b || none);
  let wrapA = conf.wrap, wrapB = rest.wrap;
  return {
    props: conc(conf.props, rest.props),
    defineNodes: conc(conf.defineNodes, rest.defineNodes),
    parseBlock: conc(conf.parseBlock, rest.parseBlock),
    parseInline: conc(conf.parseInline, rest.parseInline),
    remove: conc(conf.remove, rest.remove),
    wrap: !wrapA ? wrapB : !wrapB ? wrapA : (inner, input, fragments, ranges) => wrapA(wrapB(inner, input, fragments, ranges), input, fragments, ranges)
  };
}
function findName(names, name2) {
  let found = names.indexOf(name2);
  if (found < 0)
    throw new RangeError(`Position specified relative to unknown parser ${name2}`);
  return found;
}
var nodeTypes = [NodeType.none];
for (let i = 1, name2; name2 = Type[i]; i++) {
  nodeTypes[i] = NodeType.define({
    id: i,
    name: name2,
    props: i >= Type.Escape ? [] : [[NodeProp.group, i in DefaultSkipMarkup ? ["Block", "BlockContext"] : ["Block", "LeafBlock"]]],
    top: name2 == "Document"
  });
}
var none = [];
var Buffer2 = class {
  constructor(nodeSet) {
    this.nodeSet = nodeSet;
    this.content = [];
    this.nodes = [];
  }
  write(type, from, to, children = 0) {
    this.content.push(type, from, to, 4 + children * 4);
    return this;
  }
  writeElements(elts, offset = 0) {
    for (let e of elts)
      e.writeTo(this, offset);
    return this;
  }
  finish(type, length) {
    return Tree.build({
      buffer: this.content,
      nodeSet: this.nodeSet,
      reused: this.nodes,
      topID: type,
      length
    });
  }
};
var Element2 = class {
  /**
  @internal
  */
  constructor(type, from, to, children = none) {
    this.type = type;
    this.from = from;
    this.to = to;
    this.children = children;
  }
  /**
  @internal
  */
  writeTo(buf, offset) {
    let startOff = buf.content.length;
    buf.writeElements(this.children, offset);
    buf.content.push(this.type, this.from + offset, this.to + offset, buf.content.length + 4 - startOff);
  }
  /**
  @internal
  */
  toTree(nodeSet) {
    return new Buffer2(nodeSet).writeElements(this.children, -this.from).finish(this.type, this.to - this.from);
  }
};
var TreeElement = class {
  constructor(tree, from) {
    this.tree = tree;
    this.from = from;
  }
  get to() {
    return this.from + this.tree.length;
  }
  get type() {
    return this.tree.type.id;
  }
  get children() {
    return none;
  }
  writeTo(buf, offset) {
    buf.nodes.push(this.tree);
    buf.content.push(buf.nodes.length - 1, this.from + offset, this.to + offset, -1);
  }
  toTree() {
    return this.tree;
  }
};
function elt(type, from, to, children) {
  return new Element2(type, from, to, children);
}
var EmphasisUnderscore = { resolve: "Emphasis", mark: "EmphasisMark" };
var EmphasisAsterisk = { resolve: "Emphasis", mark: "EmphasisMark" };
var LinkStart = {};
var ImageStart = {};
var InlineDelimiter = class {
  constructor(type, from, to, side, size = to - from) {
    this.type = type;
    this.from = from;
    this.to = to;
    this.side = side;
    this.size = size;
  }
};
var Escapable = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
var Punctuation = /[!"#$%&'()*+,\-.\/:;<=>?@\[\\\]^_`{|}~\xA1\u2010-\u2027]/;
try {
  Punctuation = new RegExp("[\\p{S}|\\p{P}]", "u");
} catch (_) {
}
var DefaultInline = {
  Escape(cx, next, start) {
    if (next != 92 || start == cx.end - 1)
      return -1;
    let escaped = cx.char(start + 1);
    for (let i = 0; i < Escapable.length; i++)
      if (Escapable.charCodeAt(i) == escaped)
        return cx.append(elt(Type.Escape, start, start + 2));
    return -1;
  },
  Entity(cx, next, start) {
    if (next != 38)
      return -1;
    let m = /^(?:#\d+|#x[a-f\d]+|\w+);/i.exec(cx.slice(start + 1, start + 31));
    return m ? cx.append(elt(Type.Entity, start, start + 1 + m[0].length)) : -1;
  },
  InlineCode(cx, next, start) {
    if (next != 96 || start && cx.char(start - 1) == 96)
      return -1;
    let pos = start + 1;
    while (pos < cx.end && cx.char(pos) == 96)
      pos++;
    let size = pos - start, curSize = 0;
    for (; pos < cx.end; pos++) {
      if (cx.char(pos) == 96) {
        curSize++;
        if (curSize == size && cx.char(pos + 1) != 96)
          return cx.append(elt(Type.InlineCode, start, pos + 1, [
            elt(Type.CodeMark, start, start + size),
            elt(Type.CodeMark, pos + 1 - size, pos + 1)
          ]));
      } else {
        curSize = 0;
      }
    }
    return -1;
  },
  HTMLTag(cx, next, start) {
    if (next != 60 || start == cx.end - 1)
      return -1;
    let after = cx.slice(start + 1, cx.end);
    let url = /^(?:[a-z][-\w+.]+:[^\s>]+|[a-z\d.!#$%&'*+/=?^_`{|}~-]+@[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)*)>/i.exec(after);
    if (url) {
      return cx.append(elt(Type.Autolink, start, start + 1 + url[0].length, [
        elt(Type.LinkMark, start, start + 1),
        // url[0] includes the closing bracket, so exclude it from this slice
        elt(Type.URL, start + 1, start + url[0].length),
        elt(Type.LinkMark, start + url[0].length, start + 1 + url[0].length)
      ]));
    }
    let comment2 = /^!--[^>](?:-[^-]|[^-])*?-->/i.exec(after);
    if (comment2)
      return cx.append(elt(Type.Comment, start, start + 1 + comment2[0].length));
    let procInst = /^\?[^]*?\?>/.exec(after);
    if (procInst)
      return cx.append(elt(Type.ProcessingInstruction, start, start + 1 + procInst[0].length));
    let m = /^(?:![A-Z][^]*?>|!\[CDATA\[[^]*?\]\]>|\/\s*[a-zA-Z][\w-]*\s*>|\s*[a-zA-Z][\w-]*(\s+[a-zA-Z:_][\w-.:]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*(\/\s*)?>)/.exec(after);
    if (!m)
      return -1;
    return cx.append(elt(Type.HTMLTag, start, start + 1 + m[0].length));
  },
  Emphasis(cx, next, start) {
    if (next != 95 && next != 42)
      return -1;
    let pos = start + 1;
    while (cx.char(pos) == next)
      pos++;
    let before = cx.slice(start - 1, start), after = cx.slice(pos, pos + 1);
    let pBefore = Punctuation.test(before), pAfter = Punctuation.test(after);
    let sBefore = /\s|^$/.test(before), sAfter = /\s|^$/.test(after);
    let leftFlanking = !sAfter && (!pAfter || sBefore || pBefore);
    let rightFlanking = !sBefore && (!pBefore || sAfter || pAfter);
    let canOpen = leftFlanking && (next == 42 || !rightFlanking || pBefore);
    let canClose = rightFlanking && (next == 42 || !leftFlanking || pAfter);
    return cx.append(new InlineDelimiter(next == 95 ? EmphasisUnderscore : EmphasisAsterisk, start, pos, (canOpen ? 1 : 0) | (canClose ? 2 : 0)));
  },
  HardBreak(cx, next, start) {
    if (next == 92 && cx.char(start + 1) == 10)
      return cx.append(elt(Type.HardBreak, start, start + 2));
    if (next == 32) {
      let pos = start + 1;
      while (cx.char(pos) == 32)
        pos++;
      if (cx.char(pos) == 10 && pos >= start + 2)
        return cx.append(elt(Type.HardBreak, start, pos + 1));
    }
    return -1;
  },
  Link(cx, next, start) {
    return next == 91 ? cx.append(new InlineDelimiter(
      LinkStart,
      start,
      start + 1,
      1
      /* Mark.Open */
    )) : -1;
  },
  Image(cx, next, start) {
    return next == 33 && cx.char(start + 1) == 91 ? cx.append(new InlineDelimiter(
      ImageStart,
      start,
      start + 2,
      1
      /* Mark.Open */
    )) : -1;
  },
  LinkEnd(cx, next, start) {
    if (next != 93)
      return -1;
    for (let i = cx.parts.length - 1; i >= 0; i--) {
      let part = cx.parts[i];
      if (part instanceof InlineDelimiter && (part.type == LinkStart || part.type == ImageStart)) {
        if (!part.side || cx.skipSpace(part.to) == start && !/[(\[]/.test(cx.slice(start + 1, start + 2))) {
          cx.parts[i] = null;
          return -1;
        }
        let content2 = cx.takeContent(i);
        let link = cx.parts[i] = finishLink(cx, content2, part.type == LinkStart ? Type.Link : Type.Image, part.from, start + 1);
        if (part.type == LinkStart)
          for (let j = 0; j < i; j++) {
            let p = cx.parts[j];
            if (p instanceof InlineDelimiter && p.type == LinkStart)
              p.side = 0;
          }
        return link.to;
      }
    }
    return -1;
  }
};
function finishLink(cx, content2, type, start, startPos) {
  let { text } = cx, next = cx.char(startPos), endPos = startPos;
  content2.unshift(elt(Type.LinkMark, start, start + (type == Type.Image ? 2 : 1)));
  content2.push(elt(Type.LinkMark, startPos - 1, startPos));
  if (next == 40) {
    let pos = cx.skipSpace(startPos + 1);
    let dest = parseURL(text, pos - cx.offset, cx.offset), title;
    if (dest) {
      pos = cx.skipSpace(dest.to);
      if (pos != dest.to) {
        title = parseLinkTitle(text, pos - cx.offset, cx.offset);
        if (title)
          pos = cx.skipSpace(title.to);
      }
    }
    if (cx.char(pos) == 41) {
      content2.push(elt(Type.LinkMark, startPos, startPos + 1));
      endPos = pos + 1;
      if (dest)
        content2.push(dest);
      if (title)
        content2.push(title);
      content2.push(elt(Type.LinkMark, pos, endPos));
    }
  } else if (next == 91) {
    let label = parseLinkLabel(text, startPos - cx.offset, cx.offset, false);
    if (label) {
      content2.push(label);
      endPos = label.to;
    }
  }
  return elt(type, start, endPos, content2);
}
function parseURL(text, start, offset) {
  let next = text.charCodeAt(start);
  if (next == 60) {
    for (let pos = start + 1; pos < text.length; pos++) {
      let ch = text.charCodeAt(pos);
      if (ch == 62)
        return elt(Type.URL, start + offset, pos + 1 + offset);
      if (ch == 60 || ch == 10)
        return false;
    }
    return null;
  } else {
    let depth = 0, pos = start;
    for (let escaped = false; pos < text.length; pos++) {
      let ch = text.charCodeAt(pos);
      if (space(ch)) {
        break;
      } else if (escaped) {
        escaped = false;
      } else if (ch == 40) {
        depth++;
      } else if (ch == 41) {
        if (!depth)
          break;
        depth--;
      } else if (ch == 92) {
        escaped = true;
      }
    }
    return pos > start ? elt(Type.URL, start + offset, pos + offset) : pos == text.length ? null : false;
  }
}
function parseLinkTitle(text, start, offset) {
  let next = text.charCodeAt(start);
  if (next != 39 && next != 34 && next != 40)
    return false;
  let end = next == 40 ? 41 : next;
  for (let pos = start + 1, escaped = false; pos < text.length; pos++) {
    let ch = text.charCodeAt(pos);
    if (escaped)
      escaped = false;
    else if (ch == end)
      return elt(Type.LinkTitle, start + offset, pos + 1 + offset);
    else if (ch == 92)
      escaped = true;
  }
  return null;
}
function parseLinkLabel(text, start, offset, requireNonWS) {
  for (let escaped = false, pos = start + 1, end = Math.min(text.length, pos + 999); pos < end; pos++) {
    let ch = text.charCodeAt(pos);
    if (escaped)
      escaped = false;
    else if (ch == 93)
      return requireNonWS ? false : elt(Type.LinkLabel, start + offset, pos + 1 + offset);
    else {
      if (requireNonWS && !space(ch))
        requireNonWS = false;
      if (ch == 91)
        return false;
      else if (ch == 92)
        escaped = true;
    }
  }
  return null;
}
var InlineContext = class {
  /**
  @internal
  */
  constructor(parser2, text, offset) {
    this.parser = parser2;
    this.text = text;
    this.offset = offset;
    this.parts = [];
  }
  /**
  Get the character code at the given (document-relative)
  position.
  */
  char(pos) {
    return pos >= this.end ? -1 : this.text.charCodeAt(pos - this.offset);
  }
  /**
  The position of the end of this inline section.
  */
  get end() {
    return this.offset + this.text.length;
  }
  /**
  Get a substring of this inline section. Again uses
  document-relative positions.
  */
  slice(from, to) {
    return this.text.slice(from - this.offset, to - this.offset);
  }
  /**
  @internal
  */
  append(elt2) {
    this.parts.push(elt2);
    return elt2.to;
  }
  /**
  Add a [delimiter](#DelimiterType) at this given position. `open`
  and `close` indicate whether this delimiter is opening, closing,
  or both. Returns the end of the delimiter, for convenient
  returning from [parse functions](#InlineParser.parse).
  */
  addDelimiter(type, from, to, open, close) {
    return this.append(new InlineDelimiter(type, from, to, (open ? 1 : 0) | (close ? 2 : 0)));
  }
  /**
  Returns true when there is an unmatched link or image opening
  token before the current position.
  */
  get hasOpenLink() {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      let part = this.parts[i];
      if (part instanceof InlineDelimiter && (part.type == LinkStart || part.type == ImageStart))
        return true;
    }
    return false;
  }
  /**
  Add an inline element. Returns the end of the element.
  */
  addElement(elt2) {
    return this.append(elt2);
  }
  /**
  Resolve markers between this.parts.length and from, wrapping matched markers in the
  appropriate node and updating the content of this.parts. @internal
  */
  resolveMarkers(from) {
    for (let i = from; i < this.parts.length; i++) {
      let close = this.parts[i];
      if (!(close instanceof InlineDelimiter && close.type.resolve && close.side & 2))
        continue;
      let emp = close.type == EmphasisUnderscore || close.type == EmphasisAsterisk;
      let closeSize = close.to - close.from;
      let open, j = i - 1;
      for (; j >= from; j--) {
        let part = this.parts[j];
        if (part instanceof InlineDelimiter && part.side & 1 && part.type == close.type && // Ignore emphasis delimiters where the character count doesn't match
        !(emp && (close.side & 1 || part.side & 2) && (part.size + close.size) % 3 == 0 && (part.size % 3 || close.size % 3))) {
          open = part;
          break;
        }
      }
      if (!open)
        continue;
      let type = close.type.resolve, content2 = [];
      let start = open.from, end = close.to;
      if (emp) {
        let size = Math.min(2, open.to - open.from, closeSize);
        start = open.to - size;
        end = close.from + size;
        type = size == 1 ? "Emphasis" : "StrongEmphasis";
      }
      if (open.type.mark)
        content2.push(this.elt(open.type.mark, start, open.to));
      for (let k = j + 1; k < i; k++) {
        if (this.parts[k] instanceof Element2)
          content2.push(this.parts[k]);
        this.parts[k] = null;
      }
      if (close.type.mark)
        content2.push(this.elt(close.type.mark, close.from, end));
      let element = this.elt(type, start, end, content2);
      this.parts[j] = emp && open.from != start ? new InlineDelimiter(open.type, open.from, start, open.side, open.size) : null;
      let keep = this.parts[i] = emp && close.to != end ? new InlineDelimiter(close.type, end, close.to, close.side, close.size) : null;
      if (keep)
        this.parts.splice(i, 0, element);
      else
        this.parts[i] = element;
    }
    let result = [];
    for (let i = from; i < this.parts.length; i++) {
      let part = this.parts[i];
      if (part instanceof Element2)
        result.push(part);
    }
    return result;
  }
  /**
  Find an opening delimiter of the given type. Returns `null` if
  no delimiter is found, or an index that can be passed to
  [`takeContent`](#InlineContext.takeContent) otherwise.
  */
  findOpeningDelimiter(type) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      let part = this.parts[i];
      if (part instanceof InlineDelimiter && part.type == type && part.side & 1)
        return i;
    }
    return null;
  }
  /**
  Remove all inline elements and delimiters starting from the
  given index (which you should get from
  [`findOpeningDelimiter`](#InlineContext.findOpeningDelimiter),
  resolve delimiters inside of them, and return them as an array
  of elements.
  */
  takeContent(startIndex) {
    let content2 = this.resolveMarkers(startIndex);
    this.parts.length = startIndex;
    return content2;
  }
  /**
  Return the delimiter at the given index. Mostly useful to get
  additional info out of a delimiter index returned by
  [`findOpeningDelimiter`](#InlineContext.findOpeningDelimiter).
  Returns null if there is no delimiter at this index.
  */
  getDelimiterAt(index) {
    let part = this.parts[index];
    return part instanceof InlineDelimiter ? part : null;
  }
  /**
  Skip space after the given (document) position, returning either
  the position of the next non-space character or the end of the
  section.
  */
  skipSpace(from) {
    return skipSpace(this.text, from - this.offset) + this.offset;
  }
  elt(type, from, to, children) {
    if (typeof type == "string")
      return elt(this.parser.getNodeType(type), from, to, children);
    return new TreeElement(type, from);
  }
};
InlineContext.linkStart = LinkStart;
InlineContext.imageStart = ImageStart;
InlineContext.emphasisAsterisk = EmphasisAsterisk;
InlineContext.emphasisUnderscore = EmphasisUnderscore;
function injectMarks(elements, marks) {
  if (!marks.length)
    return elements;
  if (!elements.length)
    return marks;
  let elts = elements.slice(), eI = 0;
  for (let mark of marks) {
    while (eI < elts.length && elts[eI].to < mark.to)
      eI++;
    if (eI < elts.length && elts[eI].from < mark.from) {
      let e = elts[eI];
      if (e instanceof Element2)
        elts[eI] = new Element2(e.type, e.from, e.to, injectMarks(e.children, [mark]));
    } else {
      elts.splice(eI++, 0, mark);
    }
  }
  return elts;
}
var NotLast = [Type.CodeBlock, Type.ListItem, Type.OrderedList, Type.BulletList];
var FragmentCursor = class {
  constructor(fragments, input) {
    this.fragments = fragments;
    this.input = input;
    this.i = 0;
    this.fragment = null;
    this.fragmentEnd = -1;
    this.cursor = null;
    if (fragments.length)
      this.fragment = fragments[this.i++];
  }
  nextFragment() {
    this.fragment = this.i < this.fragments.length ? this.fragments[this.i++] : null;
    this.cursor = null;
    this.fragmentEnd = -1;
  }
  moveTo(pos, lineStart) {
    while (this.fragment && this.fragment.to <= pos)
      this.nextFragment();
    if (!this.fragment || this.fragment.from > (pos ? pos - 1 : 0))
      return false;
    if (this.fragmentEnd < 0) {
      let end = this.fragment.to;
      while (end > 0 && this.input.read(end - 1, end) != "\n")
        end--;
      this.fragmentEnd = end ? end - 1 : 0;
    }
    let c = this.cursor;
    if (!c) {
      c = this.cursor = this.fragment.tree.cursor();
      c.firstChild();
    }
    let rPos = pos + this.fragment.offset;
    while (c.to <= rPos)
      if (!c.parent())
        return false;
    for (; ; ) {
      if (c.from >= rPos)
        return this.fragment.from <= lineStart;
      if (!c.childAfter(rPos))
        return false;
    }
  }
  matches(hash) {
    let tree = this.cursor.tree;
    return tree && tree.prop(NodeProp.contextHash) == hash;
  }
  takeNodes(cx) {
    let cur = this.cursor, off = this.fragment.offset, fragEnd = this.fragmentEnd - (this.fragment.openEnd ? 1 : 0);
    let start = cx.absoluteLineStart, end = start, blockI = cx.block.children.length;
    let prevEnd = end, prevI = blockI;
    for (; ; ) {
      if (cur.to - off > fragEnd || cur.to - off > cx.to) {
        if (cur.type.isAnonymous && cur.firstChild())
          continue;
        break;
      }
      let pos = toRelative(cur.from - off, cx.ranges);
      if (cur.to - off <= cx.ranges[cx.rangeI].to) {
        cx.addNode(cur.tree, pos);
      } else {
        let dummy = new Tree(cx.parser.nodeSet.types[Type.Paragraph], [], [], 0, cx.block.hashProp);
        cx.reusePlaceholders.set(dummy, cur.tree);
        cx.addNode(dummy, pos);
      }
      if (cur.type.is("Block")) {
        if (NotLast.indexOf(cur.type.id) < 0) {
          end = cur.to - off;
          blockI = cx.block.children.length;
        } else {
          end = prevEnd;
          blockI = prevI;
        }
        prevEnd = cur.to - off;
        prevI = cx.block.children.length;
      }
      if (!cur.nextSibling())
        break;
    }
    while (cx.block.children.length > blockI) {
      cx.block.children.pop();
      cx.block.positions.pop();
    }
    return end - start;
  }
};
function toRelative(abs, ranges) {
  let pos = abs;
  for (let i = 1; i < ranges.length; i++) {
    let gapFrom = ranges[i - 1].to, gapTo = ranges[i].from;
    if (gapFrom < abs)
      pos -= gapTo - gapFrom;
  }
  return pos;
}
var markdownHighlighting = styleTags({
  "Blockquote/...": tags.quote,
  HorizontalRule: tags.contentSeparator,
  "ATXHeading1/... SetextHeading1/...": tags.heading1,
  "ATXHeading2/... SetextHeading2/...": tags.heading2,
  "ATXHeading3/...": tags.heading3,
  "ATXHeading4/...": tags.heading4,
  "ATXHeading5/...": tags.heading5,
  "ATXHeading6/...": tags.heading6,
  "Comment CommentBlock": tags.comment,
  Escape: tags.escape,
  Entity: tags.character,
  "Emphasis/...": tags.emphasis,
  "StrongEmphasis/...": tags.strong,
  "Link/... Image/...": tags.link,
  "OrderedList/... BulletList/...": tags.list,
  "BlockQuote/...": tags.quote,
  "InlineCode CodeText": tags.monospace,
  "URL Autolink": tags.url,
  "HeaderMark HardBreak QuoteMark ListMark LinkMark EmphasisMark CodeMark": tags.processingInstruction,
  "CodeInfo LinkLabel": tags.labelName,
  LinkTitle: tags.string,
  Paragraph: tags.content
});
var parser = new MarkdownParser(new NodeSet(nodeTypes).extend(markdownHighlighting), Object.keys(DefaultBlockParsers).map((n) => DefaultBlockParsers[n]), Object.keys(DefaultBlockParsers).map((n) => DefaultLeafBlocks[n]), Object.keys(DefaultBlockParsers), DefaultEndLeaf, DefaultSkipMarkup, Object.keys(DefaultInline).map((n) => DefaultInline[n]), Object.keys(DefaultInline), []);
var StrikethroughDelim = { resolve: "Strikethrough", mark: "StrikethroughMark" };
var Strikethrough = {
  defineNodes: [{
    name: "Strikethrough",
    style: { "Strikethrough/...": tags.strikethrough }
  }, {
    name: "StrikethroughMark",
    style: tags.processingInstruction
  }],
  parseInline: [{
    name: "Strikethrough",
    parse(cx, next, pos) {
      if (next != 126 || cx.char(pos + 1) != 126 || cx.char(pos + 2) == 126)
        return -1;
      let before = cx.slice(pos - 1, pos), after = cx.slice(pos + 2, pos + 3);
      let sBefore = /\s|^$/.test(before), sAfter = /\s|^$/.test(after);
      let pBefore = Punctuation.test(before), pAfter = Punctuation.test(after);
      return cx.addDelimiter(StrikethroughDelim, pos, pos + 2, !sAfter && (!pAfter || sBefore || pBefore), !sBefore && (!pBefore || sAfter || pAfter));
    },
    after: "Emphasis"
  }]
};
function parseRow(cx, line, startI = 0, elts, offset = 0) {
  let count2 = 0, first = true, cellStart = -1, cellEnd = -1, esc = false;
  let parseCell = () => {
    elts.push(cx.elt("TableCell", offset + cellStart, offset + cellEnd, cx.parser.parseInline(line.slice(cellStart, cellEnd), offset + cellStart)));
  };
  for (let i = startI; i < line.length; i++) {
    let next = line.charCodeAt(i);
    if (next == 124 && !esc) {
      if (!first || cellStart > -1)
        count2++;
      first = false;
      if (elts) {
        if (cellStart > -1)
          parseCell();
        elts.push(cx.elt("TableDelimiter", i + offset, i + offset + 1));
      }
      cellStart = cellEnd = -1;
    } else if (esc || next != 32 && next != 9) {
      if (cellStart < 0)
        cellStart = i;
      cellEnd = i + 1;
    }
    esc = !esc && next == 92;
  }
  if (cellStart > -1) {
    count2++;
    if (elts)
      parseCell();
  }
  return count2;
}
function hasPipe(str, start) {
  for (let i = start; i < str.length; i++) {
    let next = str.charCodeAt(i);
    if (next == 124)
      return true;
    if (next == 92)
      i++;
  }
  return false;
}
var delimiterLine = /^[>\s]*\|?(\s*:?-+:?\s*\|)+(\s*:?-+:?\s*)?$/;
var TableParser = class {
  constructor() {
    this.rows = null;
  }
  nextLine(cx, line, leaf) {
    if (this.rows == null) {
      this.rows = false;
      let lineText;
      if ((line.next == 45 || line.next == 58 || line.next == 124) && delimiterLine.test(lineText = line.text.slice(line.pos))) {
        let firstRow = [], firstCount = parseRow(cx, leaf.content, 0, firstRow, leaf.start);
        if (firstCount == parseRow(cx, lineText, 0))
          this.rows = [
            cx.elt("TableHeader", leaf.start, leaf.start + leaf.content.length, firstRow),
            cx.elt("TableDelimiter", cx.lineStart + line.pos, cx.lineStart + line.text.length)
          ];
      }
    } else if (this.rows) {
      let content2 = [];
      parseRow(cx, line.text, line.pos, content2, cx.lineStart);
      this.rows.push(cx.elt("TableRow", cx.lineStart + line.pos, cx.lineStart + line.text.length, content2));
    }
    return false;
  }
  finish(cx, leaf) {
    if (!this.rows)
      return false;
    cx.addLeafElement(leaf, cx.elt("Table", leaf.start, leaf.start + leaf.content.length, this.rows));
    return true;
  }
};
var Table = {
  defineNodes: [
    { name: "Table", block: true },
    { name: "TableHeader", style: { "TableHeader/...": tags.heading } },
    "TableRow",
    { name: "TableCell", style: tags.content },
    { name: "TableDelimiter", style: tags.processingInstruction }
  ],
  parseBlock: [{
    name: "Table",
    leaf(_, leaf) {
      return hasPipe(leaf.content, 0) ? new TableParser() : null;
    },
    endLeaf(cx, line, leaf) {
      if (leaf.parsers.some((p) => p instanceof TableParser) || !hasPipe(line.text, line.basePos))
        return false;
      let next = cx.peekLine();
      return delimiterLine.test(next) && parseRow(cx, line.text, line.basePos) == parseRow(cx, next, line.basePos);
    },
    before: "SetextHeading"
  }]
};
var TaskParser = class {
  nextLine() {
    return false;
  }
  finish(cx, leaf) {
    cx.addLeafElement(leaf, cx.elt("Task", leaf.start, leaf.start + leaf.content.length, [
      cx.elt("TaskMarker", leaf.start, leaf.start + 3),
      ...cx.parser.parseInline(leaf.content.slice(3), leaf.start + 3)
    ]));
    return true;
  }
};
var TaskList = {
  defineNodes: [
    { name: "Task", block: true, style: tags.list },
    { name: "TaskMarker", style: tags.atom }
  ],
  parseBlock: [{
    name: "TaskList",
    leaf(cx, leaf) {
      return /^\[[ xX]\][ \t]/.test(leaf.content) && cx.parentType().name == "ListItem" ? new TaskParser() : null;
    },
    after: "SetextHeading"
  }]
};
var autolinkRE = /(www\.)|(https?:\/\/)|([\w.+-]{1,100}@)|(mailto:|xmpp:)/gy;
var urlRE = /[\w-]+(\.[\w-]+)+(:\d+)?(\/[^\s<]*)?/gy;
var lastTwoDomainWords = /[\w-]+\.[\w-]+($|[/:])/;
var emailRE = /[\w.+-]+@[\w-]+(\.[\w.-]+)+/gy;
var xmppResourceRE = /\/[a-zA-Z\d@.]+/gy;
function count(str, from, to, ch) {
  let result = 0;
  for (let i = from; i < to; i++)
    if (str[i] == ch)
      result++;
  return result;
}
function autolinkURLEnd(text, from) {
  urlRE.lastIndex = from;
  let m = urlRE.exec(text);
  if (!m || lastTwoDomainWords.exec(m[0])[0].indexOf("_") > -1)
    return -1;
  let end = from + m[0].length;
  for (; ; ) {
    let last = text[end - 1], m2;
    if (/[?!.,:*_~]/.test(last) || last == ")" && count(text, from, end, ")") > count(text, from, end, "("))
      end--;
    else if (last == ";" && (m2 = /&(?:#\d+|#x[a-f\d]+|\w+);$/.exec(text.slice(from, end))))
      end = from + m2.index;
    else
      break;
  }
  return end;
}
function autolinkEmailEnd(text, from) {
  emailRE.lastIndex = from;
  let m = emailRE.exec(text);
  if (!m)
    return -1;
  let last = m[0][m[0].length - 1];
  return last == "_" || last == "-" ? -1 : from + m[0].length - (last == "." ? 1 : 0);
}
var Autolink = {
  parseInline: [{
    name: "Autolink",
    parse(cx, next, absPos) {
      let pos = absPos - cx.offset;
      if (pos && /\w/.test(cx.text[pos - 1]))
        return -1;
      autolinkRE.lastIndex = pos;
      let m = autolinkRE.exec(cx.text), end = -1;
      if (!m)
        return -1;
      if (m[1] || m[2]) {
        end = autolinkURLEnd(cx.text, pos + m[0].length);
        if (end > -1 && cx.hasOpenLink) {
          let noBracket = /([^\[\]]|\[[^\]]*\])*/.exec(cx.text.slice(pos, end));
          end = pos + noBracket[0].length;
        }
      } else if (m[3]) {
        end = autolinkEmailEnd(cx.text, pos);
      } else {
        end = autolinkEmailEnd(cx.text, pos + m[0].length);
        if (end > -1 && m[0] == "xmpp:") {
          xmppResourceRE.lastIndex = end;
          m = xmppResourceRE.exec(cx.text);
          if (m)
            end = m.index + m[0].length;
        }
      }
      if (end < 0)
        return -1;
      cx.addElement(cx.elt("URL", absPos, end + cx.offset));
      return end + cx.offset;
    }
  }]
};
var GFM = [Table, TaskList, Strikethrough, Autolink];
function parseSubSuper(ch, node, mark) {
  return (cx, next, pos) => {
    if (next != ch || cx.char(pos + 1) == ch)
      return -1;
    let elts = [cx.elt(mark, pos, pos + 1)];
    for (let i = pos + 1; i < cx.end; i++) {
      let next2 = cx.char(i);
      if (next2 == ch)
        return cx.addElement(cx.elt(node, pos, i + 1, elts.concat(cx.elt(mark, i, i + 1))));
      if (next2 == 92)
        elts.push(cx.elt("Escape", i, i++ + 2));
      if (space(next2))
        break;
    }
    return -1;
  };
}
var Superscript = {
  defineNodes: [
    { name: "Superscript", style: tags.special(tags.content) },
    { name: "SuperscriptMark", style: tags.processingInstruction }
  ],
  parseInline: [{
    name: "Superscript",
    parse: parseSubSuper(94, "Superscript", "SuperscriptMark")
  }]
};
var Subscript = {
  defineNodes: [
    { name: "Subscript", style: tags.special(tags.content) },
    { name: "SubscriptMark", style: tags.processingInstruction }
  ],
  parseInline: [{
    name: "Subscript",
    parse: parseSubSuper(126, "Subscript", "SubscriptMark")
  }]
};
var Emoji = {
  defineNodes: [{ name: "Emoji", style: tags.character }],
  parseInline: [{
    name: "Emoji",
    parse(cx, next, pos) {
      let match;
      if (next != 58 || !(match = /^[a-zA-Z_0-9]+:/.exec(cx.slice(pos + 1, cx.end))))
        return -1;
      return cx.addElement(cx.elt("Emoji", pos, pos + 1 + match[0].length));
    }
  }]
};

// src/model.ts
var markdown = parser.configure(GFM);
var limit = (n, min, max) => Math.min(max, Math.max(min, n));
function blocks(source) {
  const frontmatter = source.match(
    /^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/
  )?.[0].length ?? 0;
  const result = [];
  for (let node = markdown.parse(source).topNode.firstChild; node; node = node.nextSibling) {
    if (node.from < frontmatter || !source.slice(node.from, node.to).trim())
      continue;
    result.push({
      from: node.from,
      to: node.to,
      kind: node.name,
      text: source.slice(node.from, node.to)
    });
  }
  return result;
}
function blockAt(source, pos) {
  return blocks(source).find((b) => b.from <= pos && pos <= b.to);
}
function capture(pin, source) {
  return {
    ...pin,
    text: source.slice(pin.from, pin.to),
    before: source.slice(Math.max(0, pin.from - 64), pin.from),
    after: source.slice(pin.to, pin.to + 64)
  };
}
function restore(saved, source) {
  const pins = [];
  const detached = [];
  for (const old of saved) {
    const candidates = [];
    let at = 0;
    if (old.text)
      while (at <= source.length - old.text.length) {
        const found2 = source.indexOf(old.text, at);
        if (found2 < 0) break;
        const end2 = found2 + old.text.length;
        if ((found2 === 0 || source[found2 - 1] === "\n") && (end2 === source.length || source[end2] === "\n" || source.slice(end2, end2 + 2) === "\r\n"))
          candidates.push(found2);
        at = found2 + 1;
      }
    const contextual = candidates.filter(
      (p) => source.slice(Math.max(0, p - 64), p) === old.before && source.slice(p + old.text.length, p + old.text.length + 64) === old.after
    );
    const found = candidates.length === 1 ? candidates[0] : contextual.length === 1 ? contextual[0] : void 0;
    const end = found === void 0 ? 0 : found + old.text.length;
    if (found === void 0 || pins.some((p) => found < p.to && end > p.from)) {
      detached.push(old);
      continue;
    }
    pins.push({ ...old, from: found, to: end });
  }
  return { pins, detached };
}
function normalize(raw) {
  const result = { version: 5, notes: {} };
  if (!raw || typeof raw !== "object") return result;
  const object = raw;
  if (object.version === 1) {
    result.legacyBoards = object.boards;
    return result;
  }
  if (object.version !== 2 && object.version !== 3 && object.version !== 4 && object.version !== 5)
    throw new Error(
      "Unsupported Canvsidian data version. Existing layout data was not overwritten."
    );
  result.settings = normalizePreferences(object.settings);
  if (object.legacyBoards) result.legacyBoards = object.legacyBoards;
  result.toolDefaults = {};
  for (const [mode, v] of Object.entries(object.toolDefaults ?? {})) {
    if (![
      "pen",
      "highlighter",
      "rect",
      "ellipse",
      "line",
      "diamond",
      "arrow",
      "connector",
      "sticky",
      "label",
      "sticker",
      "tape",
      "icon",
      "text",
      "section",
      "triangle",
      "table",
      "code"
    ].includes(mode) || !v)
      continue;
    if (!validStroke(v.stroke) || ![v.strokeWidth, v.opacity, v.fontSize].every(Number.isFinite))
      continue;
    result.toolDefaults[mode] = {
      iconId: typeof v.iconId === "string" && /^[a-z0-9-]{1,100}$/.test(v.iconId) ? v.iconId : "star",
      stroke: v.stroke,
      strokeWidth: limit(v.strokeWidth, 1, 32),
      opacity: limit(v.opacity, 0.1, 1),
      fontSize: limit(v.fontSize, 12, 144),
      fill: v.fill === "none" || validStroke(v.fill) ? v.fill : "none",
      sticker: STICKERS.some((s) => s.id === v.sticker) ? v.sticker : "star"
    };
  }
  if (Array.isArray(object.recoveryDrafts))
    result.recoveryDrafts = object.recoveryDrafts.filter(
      (d) => d && ["id", "path", "text", "savedAt"].every(
        (k) => typeof d[k] === "string"
      )
    );
  for (const [path, note] of Object.entries(object.notes ?? {})) {
    if (!Array.isArray(note?.pins)) continue;
    result.notes[path] = {
      enabled: note.enabled !== false,
      viewX: Number.isFinite(note.viewX) ? limit(note.viewX, -5e4, 5e4) : 0,
      drawings: normalizeDrawings(note.drawings),
      pins: note.pins.filter(
        (p) => p && typeof p.id === "string" && typeof p.text === "string" && typeof p.before === "string" && typeof p.after === "string" && [p.from, p.to, p.x, p.y, p.width, p.height].every(
          Number.isFinite
        ) && p.from >= 0 && p.to >= p.from
      ).map((p) => ({
        ...p,
        rotation: normalizeAngle(p.rotation),
        layer: Number.isFinite(p.layer) ? limit(p.layer, -1e5, 1e5) : 0,
        fontSize: Number.isFinite(p.fontSize) ? limit(p.fontSize, 12, 144) : void 0,
        color: validStroke(p.color) ? p.color : void 0,
        background: validStroke(p.background) ? p.background : void 0,
        x: limit(p.x, -5e4, 5e4),
        y: limit(p.y, 0, 5e4),
        width: limit(p.width, 120, 4e3),
        height: limit(p.height, 28, 1e4)
      }))
    };
  }
  return result;
}
var validStroke = (s) => s === "currentColor" || typeof s === "string" && /^#[0-9a-f]{6}$/i.test(s);
function normalizeDrawings(raw) {
  if (!Array.isArray(raw)) return [];
  const ids = /* @__PURE__ */ new Set();
  return raw.filter(
    (d) => d && typeof d.id === "string" && !ids.has(d.id) && (ids.add(d.id), true) && [
      "pen",
      "rect",
      "ellipse",
      "line",
      "diamond",
      "arrow",
      "connector",
      "sticky",
      "label",
      "sticker",
      "tape",
      "image",
      "icon",
      "triangle",
      "text",
      "section",
      "table",
      "code"
    ].includes(d.kind) && [d.x, d.y, d.width, d.height, d.strokeWidth, d.opacity].every(
      Number.isFinite
    ) && validStroke(d.stroke) && (d.kind !== "pen" || Array.isArray(d.points))
  ).map((d) => ({
    ...d,
    rotation: normalizeAngle(d.rotation),
    layer: Number.isFinite(d.layer) ? limit(d.layer, -1e5, 1e5) : 0,
    sourceId: ["connector", "arrow"].includes(d.kind) && typeof d.sourceId === "string" ? d.sourceId : void 0,
    targetId: ["connector", "arrow"].includes(d.kind) && typeof d.targetId === "string" ? d.targetId : void 0,
    parentId: d.kind === "tape" && typeof d.parentId === "string" ? d.parentId : void 0,
    rotationOffset: normalizeAngle(d.rotationOffset),
    assetPath: safeAssetPath(d.assetPath) ? d.assetPath : void 0,
    iconId: typeof d.iconId === "string" && /^[a-z0-9-]{1,100}$/.test(d.iconId) ? d.iconId : "star",
    text: typeof d.text === "string" ? d.text.slice(0, 1e4) : "",
    fontSize: Number.isFinite(d.fontSize) ? limit(d.fontSize, 12, 144) : 18,
    fill: d.fill === "none" || validStroke(d.fill) ? d.fill : "none",
    sticker: STICKERS.some((s) => s.id === d.sticker) ? d.sticker : "star",
    x: limit(d.x, -5e4, 5e4),
    y: limit(d.y, 0, 5e4),
    width: limit(d.width, 2, 1e4),
    height: limit(d.height, 2, 1e4),
    strokeWidth: limit(d.strokeWidth, 1, 32),
    opacity: limit(d.opacity, 0.1, 1),
    points: (Array.isArray(d.points) ? d.points : void 0)?.filter(
      (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)
    ).slice(0, 5e3).map((p) => [limit(p[0], 0, 1), limit(p[1], 0, 1)])
  }));
}
function drawingFromPoints(kind, world, stroke = "currentColor", strokeWidth = 2, opacity = 1) {
  if (world.length < 2) return null;
  let points = world.filter(
    (p, i) => i === 0 || i === world.length - 1 || Math.hypot(p[0] - world[i - 1][0], p[1] - world[i - 1][1]) >= 1.5
  ).slice(0, 5e3);
  if (points.length < 2) points = [world[0], world[world.length - 1]];
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys), width = Math.max(2, Math.max(...xs) - x), height = Math.max(2, Math.max(...ys) - y);
  if (width < 3 && height < 3) return null;
  return {
    id: crypto.randomUUID(),
    kind,
    x,
    y,
    width,
    height,
    stroke,
    strokeWidth,
    opacity,
    points: points.map((p) => [(p[0] - x) / width, (p[1] - y) / height])
  };
}
function resized(start, dx, dy, handle, minWidth = 24, minHeight = 24) {
  let left = start.x, top = start.y, right = left + start.width, bottom = top + start.height;
  if (handle.includes("w")) left = limit(left + dx, -5e4, right - minWidth);
  if (handle.includes("e")) right = limit(right + dx, left + minWidth, 51200);
  if (handle.includes("n")) top = limit(top + dy, 0, bottom - minHeight);
  if (handle.includes("s")) bottom = limit(bottom + dy, top + minHeight, 6e4);
  return { x: left, y: top, width: right - left, height: bottom - top };
}
var STICKERS = [
  { id: "star", icon: "star", label: "Star", color: "#D5803B" },
  { id: "heart", icon: "heart", label: "Heart", color: "#E56458" },
  { id: "thumbs-up", icon: "thumbs-up", label: "Thumbs up", color: "#46A171" },
  { id: "check", icon: "circle-check", label: "Check", color: "#2783DE" },
  { id: "idea", icon: "lightbulb", label: "Idea", color: "#D5803B" },
  { id: "question", icon: "circle-help", label: "Question", color: "#9B6BC1" },
  { id: "flame", icon: "flame", label: "Flame", color: "#E56458" },
  { id: "sparkles", icon: "sparkles", label: "Sparkles", color: "#9B6BC1" },
  { id: "rocket", icon: "rocket", label: "Rocket", color: "#2783DE" },
  { id: "sun", icon: "sun", label: "Sun", color: "#D5803B" },
  { id: "moon", icon: "moon", label: "Moon", color: "#9B6BC1" },
  { id: "cloud", icon: "cloud", label: "Cloud", color: "#2783DE" },
  { id: "rainbow", icon: "rainbow", label: "Rainbow", color: "#E56458" },
  { id: "smile", icon: "smile", label: "Smile", color: "#D5803B" },
  {
    id: "party-popper",
    icon: "party-popper",
    label: "Celebrate",
    color: "#9B6BC1"
  },
  { id: "trophy", icon: "trophy", label: "Trophy", color: "#D5803B" },
  { id: "target", icon: "target", label: "Target", color: "#E56458" },
  { id: "flag", icon: "flag", label: "Flag", color: "#46A171" },
  { id: "bookmark", icon: "bookmark", label: "Bookmark", color: "#2783DE" },
  { id: "coffee", icon: "coffee", label: "Coffee", color: "#D5803B" },
  { id: "music", icon: "music", label: "Music", color: "#9B6BC1" },
  { id: "camera", icon: "camera", label: "Camera", color: "#2783DE" },
  { id: "gift", icon: "gift", label: "Gift", color: "#E56458" },
  { id: "flower-2", icon: "flower-2", label: "Flower", color: "#9B6BC1" },
  { id: "leaf", icon: "leaf", label: "Leaf", color: "#46A171" },
  { id: "tree-pine", icon: "tree-pine", label: "Tree", color: "#46A171" },
  { id: "mountain", icon: "mountain", label: "Mountain", color: "#2783DE" },
  { id: "zap", icon: "zap", label: "Lightning", color: "#D5803B" },
  { id: "brain", icon: "brain", label: "Brain", color: "#9B6BC1" }
];
var normalizePreferences = (raw) => ({
  dotGrid: raw?.dotGrid === true,
  gridSpacing: Number.isFinite(raw?.gridSpacing) ? limit(raw.gridSpacing, 12, 64) : 24,
  gridOpacity: Number.isFinite(raw?.gridOpacity) ? limit(raw.gridOpacity, 0.05, 0.4) : 0.15
});
var normalizeAngle = (n) => typeof n === "number" && Number.isFinite(n) ? (n % 360 + 540) % 360 - 180 : 0;
var safeAssetPath = (p) => typeof p === "string" && !!p && !p.startsWith("/") && !p.includes("\\") && !p.split("/").some((s) => s === ".." || s === ".") && !/[:\x00-\x1f]/.test(p);
function rotatedBounds(p) {
  const a = (p.rotation ?? 0) * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const width = p.width * c + p.height * s, height = p.width * s + p.height * c;
  return {
    ...p,
    x: p.x + (p.width - width) / 2,
    y: p.y + (p.height - height) / 2,
    width,
    height
  };
}
function rotatedResize(p, dx, dy, h, minWidth = 24, minHeight = 24) {
  const a = (p.rotation ?? 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const next = resized(
    p,
    dx * c + dy * s,
    -dx * s + dy * c,
    h,
    minWidth,
    minHeight
  );
  const cx = next.x + next.width / 2 - (p.x + p.width / 2), cy = next.y + next.height / 2 - (p.y + p.height / 2);
  return {
    ...next,
    rotation: p.rotation,
    x: limit(
      p.x + p.width / 2 + cx * c - cy * s - next.width / 2,
      -5e4,
      5e4
    ),
    y: Math.max(0, p.y + p.height / 2 + cx * s + cy * c - next.height / 2)
  };
}
function tapeOnSticky(tape, parent) {
  const a = (parent.rotation ?? 0) * Math.PI / 180, cx = parent.x + parent.width / 2, cy = parent.y + parent.height / 2;
  return {
    ...tape,
    parentId: parent.id,
    x: cx + Math.sin(a) * parent.height / 2 - tape.width / 2,
    y: cy - Math.cos(a) * parent.height / 2 - tape.height / 2,
    rotation: normalizeAngle(
      (parent.rotation ?? 0) + (tape.rotationOffset ?? -8)
    )
  };
}

// src/object-camera.ts
var cameras = /* @__PURE__ */ new WeakMap();
var objectCameraX = (scroller) => cameras.get(scroller)?.x ?? 0;
var setObjectCamera = (scroller, x) => cameras.get(scroller)?.set(x);
function edgePanSpeed(x, left, right) {
  if (x < left + 24) return Math.min(10, (left + 24 - x) * 0.4);
  if (x > right - 24) return -Math.min(10, (x - right + 24) * 0.4);
  return 0;
}
function revealObject(scroller, bounds) {
  const left = scroller.scrollLeft - objectCameraX(scroller), width = scroller.clientWidth;
  if (bounds.x < left + 16)
    setObjectCamera(scroller, scroller.scrollLeft - bounds.x + 16);
  else if (bounds.x + bounds.width > left + width - 16)
    setObjectCamera(
      scroller,
      scroller.scrollLeft - bounds.x - Math.min(bounds.width, width - 32) + width - 16
    );
}
var ObjectCamera = class {
  constructor(editor, scroller, layer, changed) {
    this.editor = editor;
    this.scroller = scroller;
    this.layer = layer;
    this.changed = changed;
    this.viewport.className = "cv-object-viewport";
    this.viewport.contentEditable = "false";
    this.viewport.append(layer);
    scroller.append(this.viewport);
    cameras.set(scroller, this);
    this.observer = new ResizeObserver(this.schedule);
    this.observer.observe(editor);
    this.observer.observe(scroller);
    this.layout();
  }
  viewport = document.createElement("div");
  x = 0;
  observer;
  frame = 0;
  destroyed = false;
  schedule = () => {
    if (!this.frame && !this.destroyed)
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.layout();
      });
  };
  layout() {
    this.viewport.style.width = this.scroller.clientWidth + "px";
    this.layer.style.transform = `translate3d(${this.x}px,0,0)`;
  }
  set(value, notify = true) {
    const x = limit(Number.isFinite(value) ? value : 0, -5e4, 5e4);
    if (x === this.x) return;
    this.x = x;
    this.layout();
    if (notify) this.changed(x);
  }
  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    cameras.delete(this.scroller);
    this.viewport.remove();
  }
};

// src/spatial.ts
var import_state = require("@codemirror/state");
var import_view = require("@codemirror/view");
var import_commands = require("@codemirror/commands");
var import_obsidian4 = require("obsidian");

// src/interaction.ts
var import_obsidian = require("obsidian");
function iconButton(parent, icon, label, callback) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cv-icon-button";
  button.setAttribute("aria-label", label);
  button.title = label;
  (0, import_obsidian.setIcon)(button, icon);
  button.onclick = callback;
  parent.append(button);
  return button;
}
function previewGesture(event, options) {
  event.preventDefault();
  event.stopPropagation();
  const { scroller, root, start } = options;
  const origin = {
    x: event.clientX,
    y: event.clientY,
    sx: scroller.scrollLeft,
    sy: scroller.scrollTop,
    camera: objectCameraX(scroller)
  };
  let current = { ...start }, clientX = event.clientX, clientY = event.clientY, frame = 0, done = false, moved = false;
  root.classList.add("is-transforming");
  scroller.classList.add("cv-has-gesture");
  const project = () => {
    current = options.project(
      clientX - origin.x + scroller.scrollLeft - origin.sx - objectCameraX(scroller) + origin.camera,
      clientY - origin.y + scroller.scrollTop - origin.sy
    );
  };
  const paint = () => {
    frame = 0;
    if (moved && options.autoPan !== false) {
      const r = scroller.getBoundingClientRect();
      const speed = edgePanSpeed(
        clientX,
        r.left + scroller.clientLeft,
        r.left + scroller.clientLeft + scroller.clientWidth
      );
      if (speed) {
        setObjectCamera(scroller, objectCameraX(scroller) + speed);
        project();
        frame = requestAnimationFrame(paint);
      }
    }
    root.style.transform = `translate3d(${current.x - start.x}px,${current.y - start.y}px,0)`;
    if (current.width !== start.width) root.style.width = current.width + "px";
    if (options.explicitHeight && current.height !== start.height)
      root.style.height = current.height + "px";
    options.preview?.(current);
  };
  const move = (e) => {
    if (e.pointerId !== event.pointerId || done) return;
    moved ||= Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 1;
    clientX = e.clientX;
    clientY = e.clientY;
    project();
    if (!frame) frame = requestAnimationFrame(paint);
  };
  const finish = (cancel) => {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancelEvent);
    window.removeEventListener("blur", blur);
    window.removeEventListener("keydown", key, true);
    if (cancel) setObjectCamera(scroller, origin.camera);
    const value = cancel ? start : current;
    root.style.transform = "";
    root.style.left = value.x + "px";
    root.style.top = value.y + "px";
    root.style.width = value.width + "px";
    if (options.explicitHeight) root.style.height = value.height + "px";
    root.classList.remove("is-transforming");
    scroller.classList.remove("cv-has-gesture");
    options.end?.();
    if (!cancel && (value.x !== start.x || value.y !== start.y || value.width !== start.width || value.height !== start.height))
      options.commit(value);
    options.finishPreview?.();
  };
  const up = (e) => {
    if (e.pointerId === event.pointerId) {
      move(e);
      finish(false);
    }
  };
  const cancelEvent = (e) => {
    if (e.pointerId === event.pointerId) finish(true);
  };
  const blur = () => finish(true);
  const key = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    }
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancelEvent);
  window.addEventListener("blur", blur);
  window.addEventListener("keydown", key, true);
  return () => finish(true);
}
var Selection = class {
  constructor(scroller, applyLayers) {
    this.scroller = scroller;
    this.applyLayers = applyLayers;
    this.observer = new ResizeObserver(() => this.align());
    this.observer.observe(scroller);
  }
  observer;
  align() {
    for (const item of this.items) item.alignGrip?.();
  }
  destroy() {
    this.observer.disconnect();
    this.items.clear();
  }
  current = null;
  items = /* @__PURE__ */ new Set();
  register(item) {
    this.items.add(item);
  }
  refreshLayers() {
    [...this.items].sort((a, b) => (a.position().layer ?? 0) - (b.position().layer ?? 0)).forEach((item, i) => item.root.style.zIndex = String(i + 1));
  }
  reorder(direction, item = this.current) {
    if (!item) return;
    const ordered = [...this.items].sort(
      (a, b) => (a.position().layer ?? 0) - (b.position().layer ?? 0)
    );
    const index = ordered.indexOf(item);
    const next = direction === "front" ? ordered.length - 1 : direction === "back" ? 0 : Math.max(
      0,
      Math.min(
        ordered.length - 1,
        index + (direction === "forward" ? 1 : -1)
      )
    );
    if (index === next) return;
    ordered.splice(index, 1);
    ordered.splice(next, 0, item);
    const layers = Object.fromEntries(ordered.map((i, n) => [i.id, n]));
    if (this.applyLayers) this.applyLayers(layers);
    else for (const i of ordered) i.setLayer?.(layers[i.id]);
    this.refreshLayers();
  }
  select(item) {
    if (this.current !== item) {
      this.current?.root.querySelectorAll(".cv-property-popover").forEach((n) => n.remove());
      this.current?.root.classList.remove("is-selected");
      this.current = item;
      item?.root.classList.add("is-selected");
    }
    this.position();
  }
  position() {
    this.align();
    const item = this.current;
    if (!item) return;
    const p = item.position();
    const bounds = item.bounds?.() ?? p;
    const outside = bounds.x + bounds.width < this.scroller.scrollLeft - objectCameraX(this.scroller) || bounds.x > this.scroller.scrollLeft - objectCameraX(this.scroller) + this.scroller.clientWidth || bounds.y + bounds.height < this.scroller.scrollTop || bounds.y > this.scroller.scrollTop + this.scroller.clientHeight;
    item.toolbar.hidden = outside;
    if (outside) return;
    const width = item.toolbar.offsetWidth || 240;
    const left = this.scroller.scrollLeft - objectCameraX(this.scroller), top = this.scroller.scrollTop;
    item.toolbar.style.left = limit(
      bounds.x - p.x,
      left + 8 - p.x,
      left + this.scroller.clientWidth - width - 8 - p.x
    ) + "px";
    item.toolbar.style.top = Math.max(
      bounds.y - p.y - (item.toolbar.offsetHeight || 40) - 8,
      top + 8 - p.y
    ) + "px";
  }
  remove(item) {
    if (this.current === item) this.select(null);
    this.items.delete(item);
  }
};
function addHandles(parent, onPointer, onKey) {
  for (const h of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cv-resize-handle cv-handle-" + h;
    b.setAttribute("aria-label", h === "se" ? "Resize block" : "Resize " + h);
    b.onpointerdown = (e) => onPointer(e, h);
    b.onkeydown = (e) => onKey(e, h);
    parent.append(b);
  }
}
function rightGutter(scroller) {
  const content2 = scroller.querySelector(".cm-content");
  const rect = scroller.getBoundingClientRect(), size = matchMedia("(pointer:coarse)").matches ? 44 : 28;
  return Math.min(
    (content2?.getBoundingClientRect().right ?? rect.right) + 8,
    rect.left + scroller.clientLeft + scroller.clientWidth - size - 8
  ) - rect.left + scroller.scrollLeft;
}
function gripInteraction(button, drag, menu) {
  let cleanup = null;
  button.onpointerdown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    cleanup?.();
    let dragged = false;
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
      cleanup = null;
    };
    const move = (e) => {
      if (e.pointerId !== event.pointerId) return;
      if (Math.hypot(e.clientX - event.clientX, e.clientY - event.clientY) > 4) {
        dragged = true;
        stop();
        drag(event);
        window.dispatchEvent(new PointerEvent("pointermove", e));
      }
    };
    const up = (e) => {
      if (e.pointerId !== event.pointerId) return;
      stop();
      if (!dragged) menu();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    cleanup = stop;
  };
  button.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.detail === 0) menu();
  };
  return () => cleanup?.();
}
function bindContextMenu(root, open) {
  root.addEventListener("contextmenu", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(
      "textarea,input,select,[contenteditable='true'],.cv-property-popover"
    )) {
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    open(
      event.clientX || event.clientY ? { x: event.clientX, y: event.clientY } : void 0
    );
  });
}
var activeMenus = /* @__PURE__ */ new WeakMap();
function actionMenu(anchor, actions, point) {
  const editor = anchor.closest(".cm-editor");
  if (!editor) return;
  activeMenus.get(editor)?.hide();
  const menu = new import_obsidian.Menu();
  activeMenus.set(editor, menu);
  const owner = anchor.parentElement;
  const close = () => menu.hide();
  for (const action2 of actions) {
    if (action2.separator) menu.addSeparator();
    menu.addItem((item) => {
      item.setTitle(action2.label).setIcon(action2.icon ?? null).setWarning(action2.label === "Delete").onClick(() => action2.run());
    });
  }
  owner.addEventListener("cv-destroy", close, { once: true });
  menu.onHide(() => {
    owner.removeEventListener("cv-destroy", close);
    if (activeMenus.get(editor) === menu) activeMenus.delete(editor);
  });
  const rect = anchor.getBoundingClientRect();
  menu.showAtPosition(
    point ? { x: point.x, y: point.y } : { x: rect.left, y: rect.bottom, width: rect.width, left: true },
    anchor.ownerDocument
  );
}
async function copyText(text, notify) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    notify("Could not copy text to the clipboard.");
  }
}
function alignmentActions(scroller, position, change) {
  return ["left", "center", "right"].map((side, i) => ({
    label: "Align to note " + side,
    icon: "align-" + side,
    run: () => {
      const content2 = scroller.querySelector(".cm-content");
      if (!content2) return;
      const rect = content2.getBoundingClientRect(), viewport = scroller.getBoundingClientRect(), css = getComputedStyle(content2);
      const left = rect.left - viewport.left + scroller.scrollLeft - objectCameraX(scroller) + parseFloat(css.paddingLeft || "0");
      const width = rect.width - parseFloat(css.paddingLeft || "0") - parseFloat(css.paddingRight || "0");
      const p = position();
      change({
        ...p,
        x: limit(left + (width - p.width) * i / 2, -5e4, 5e4)
      });
    }
  }));
}
function layerActions(selection, item) {
  return [
    {
      separator: true,
      label: "Bring forward \xB7 Ctrl/Cmd+]",
      icon: "bring-to-front",
      run: () => selection.reorder("forward", item)
    },
    {
      label: "Send backward \xB7 Ctrl/Cmd+[",
      icon: "send-to-back",
      run: () => selection.reorder("backward", item)
    },
    {
      label: "Bring to front",
      icon: "bring-to-front",
      run: () => selection.reorder("front", item)
    },
    {
      label: "Send to back",
      icon: "send-to-back",
      run: () => selection.reorder("back", item)
    }
  ];
}
function leftGrip(root, read, drag, key, menu) {
  const b = iconButton(root, "grip-vertical", "Block actions", () => {
  });
  b.classList.add("cv-object-grip");
  const cancel = gripInteraction(
    b,
    drag,
    menu ?? (() => root.focus({ preventScroll: true }))
  );
  if (key) b.onkeydown = key;
  root.addEventListener("cv-destroy", cancel, { once: true });
  return () => {
    const p = read(), bounds = rotatedBounds(p);
    const r = root.getBoundingClientRect();
    const frame = root.querySelector(".cv-rotated-frame")?.getBoundingClientRect();
    const scroller = root.closest(".cm-editor")?.querySelector(".cm-scroller");
    const width = b.offsetWidth || (matchMedia("(pointer:coarse)").matches ? 44 : 28);
    const height = b.offsetHeight || (matchMedia("(pointer:coarse)").matches ? 44 : 32);
    const scaleX = root.offsetWidth ? r.width / root.offsetWidth : 1;
    const scaleY = root.offsetHeight ? r.height / root.offsetHeight : 1;
    let x = frame?.width ? frame.right + 8 : r.left + bounds.x - p.x + bounds.width + 8;
    const center = frame?.height ? frame.top + frame.height / 2 : r.top + bounds.y - p.y + bounds.height / 2;
    if (scroller) {
      const v = scroller.getBoundingClientRect();
      x = limit(
        x,
        v.left + scroller.clientLeft + 8,
        v.left + scroller.clientLeft + scroller.clientWidth - width - 8
      );
    }
    b.style.left = (x - r.left) / (scaleX || 1) + "px";
    b.style.top = (center - r.top) / (scaleY || 1) - height / 2 + "px";
  };
}
function rotationField(parent, value, change) {
  const label = document.createElement("label");
  label.className = "cv-rotation-field";
  label.textContent = "Rotation";
  const input = document.createElement("input");
  input.type = "number";
  input.min = "-180";
  input.max = "180";
  input.step = "1";
  input.value = String(Math.round(value));
  input.setAttribute("aria-label", "Rotation degrees");
  input.onchange = () => {
    const n = normalizeAngle(Number(input.value));
    input.value = String(n);
    change(n);
  };
  label.append(input);
  parent.append(label);
  return input;
}
function rotationHandle(root, frame, read, commit, preview) {
  let cleanup = null;
  const b = iconButton(
    frame,
    "rotate-cw",
    "Rotate object",
    () => root.focus({ preventScroll: true })
  );
  b.classList.add("cv-rotation-handle");
  b.onkeydown = (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    commit(
      normalizeAngle(
        (read().rotation ?? 0) + (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 15 : 1)
      )
    );
  };
  b.onpointerdown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    cleanup?.();
    const p = read(), r = root.getBoundingClientRect(), cx = r.left + p.width / 2, cy = r.top + p.height / 2;
    const initial = Math.atan2(e.clientY - cy, e.clientX - cx);
    let angle = p.rotation ?? 0, raf = 0, done = false;
    const move = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      angle = normalizeAngle(
        (p.rotation ?? 0) + (Math.atan2(ev.clientY - cy, ev.clientX - cx) - initial) * 180 / Math.PI
      );
      if (ev.shiftKey) angle = Math.round(angle / 15) * 15;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          frame.style.rotate = angle + "deg";
          preview?.({ ...p, rotation: angle });
        });
    };
    const finish = (cancelled) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", blur);
      frame.style.rotate = (cancelled ? p.rotation ?? 0 : angle) + "deg";
      cleanup = null;
      if (!cancelled) commit(angle);
      preview?.(null);
    };
    const up = (ev) => {
      if (ev.pointerId === e.pointerId) {
        move(ev);
        finish(false);
      }
    };
    const cancel = (ev) => {
      if (ev.pointerId === e.pointerId) finish(true);
    };
    const blur = () => finish(true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", blur);
    cleanup = () => finish(true);
  };
  return () => cleanup?.();
}

// src/connectors.ts
var margin = 18;
var contains = (r, p) => p[0] > r.x && p[0] < r.x + r.width && p[1] > r.y && p[1] < r.y + r.height;
function clear(a, b, boxes) {
  return !boxes.some(
    (r) => a[0] === b[0] ? a[0] > r.x && a[0] < r.x + r.width && Math.max(a[1], b[1]) > r.y && Math.min(a[1], b[1]) < r.y + r.height : a[1] > r.y && a[1] < r.y + r.height && Math.max(a[0], b[0]) > r.x && Math.min(a[0], b[0]) < r.x + r.width
  );
}
function port(a, b) {
  const dx = b.x + b.width / 2 - a.x - a.width / 2, dy = b.y + b.height / 2 - a.y - a.height / 2;
  if (Math.abs(dx) / (a.width + b.width) >= Math.abs(dy) / (a.height + b.height)) {
    const x = dx >= 0 ? a.x + a.width : a.x;
    return [
      [x, a.y + a.height / 2],
      [x + (dx >= 0 ? margin : -margin), a.y + a.height / 2]
    ];
  }
  const y = dy >= 0 ? a.y + a.height : a.y;
  return [
    [a.x + a.width / 2, y],
    [a.x + a.width / 2, y + (dy >= 0 ? margin : -margin)]
  ];
}
function connectorRoute(source, target, targets) {
  const a = rotatedBounds(source), b = rotatedBounds(target);
  const [start, exit] = port(a, b), [end, entry] = port(b, a);
  const boxes = targets.map(rotatedBounds).map((r) => ({
    ...r,
    x: r.x - margin,
    y: r.y - margin,
    width: r.width + margin * 2,
    height: r.height + margin * 2
  }));
  const fallback = [start, exit, [entry[0], exit[1]], entry, end];
  if (boxes.some((r) => contains(r, exit) || contains(r, entry)))
    return fallback;
  const xs = [
    .../* @__PURE__ */ new Set([
      exit[0],
      entry[0],
      ...boxes.flatMap((r) => [r.x, r.x + r.width])
    ])
  ].sort((a2, b2) => a2 - b2);
  const ys = [
    .../* @__PURE__ */ new Set([
      exit[1],
      entry[1],
      ...boxes.flatMap((r) => [r.y, r.y + r.height])
    ])
  ].sort((a2, b2) => a2 - b2);
  const key = (x, y) => y * xs.length + x;
  const sx = xs.indexOf(exit[0]), sy = ys.indexOf(exit[1]), ex = xs.indexOf(entry[0]), ey = ys.indexOf(entry[1]);
  const startKey = key(sx, sy), endKey = key(ex, ey);
  const distance = /* @__PURE__ */ new Map([[startKey, 0]]), prev = /* @__PURE__ */ new Map();
  const queue = /* @__PURE__ */ new Set([startKey]);
  while (queue.size) {
    let current = -1, best = Infinity;
    for (const k of queue) {
      const x2 = k % xs.length, y2 = Math.floor(k / xs.length);
      const score = distance.get(k) + Math.abs(xs[x2] - entry[0]) + Math.abs(ys[y2] - entry[1]);
      if (score < best) {
        best = score;
        current = k;
      }
    }
    queue.delete(current);
    if (current === endKey) {
      const path = [];
      let k = current;
      while (true) {
        path.push([xs[k % xs.length], ys[Math.floor(k / xs.length)]]);
        if (k === startKey) break;
        k = prev.get(k);
      }
      const route = [start, ...path.reverse(), end];
      return route.filter(
        (p, i) => i === 0 || i === route.length - 1 || !(route[i - 1][0] === p[0] && p[0] === route[i + 1][0] || route[i - 1][1] === p[1] && p[1] === route[i + 1][1])
      );
    }
    const x = current % xs.length, y = Math.floor(current / xs.length);
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1]
    ]) {
      if (nx < 0 || ny < 0 || nx >= xs.length || ny >= ys.length) continue;
      const p = [xs[nx], ys[ny]], q = [xs[x], ys[y]];
      if (boxes.some((r) => contains(r, p)) || !clear(q, p, boxes)) continue;
      const next = key(nx, ny), cost = distance.get(current) + Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]);
      if (cost < (distance.get(next) ?? Infinity)) {
        distance.set(next, cost);
        prev.set(next, current);
        queue.add(next);
      }
    }
  }
  return fallback;
}
function geometry(d, points) {
  const x = Math.min(...points.map((p) => p[0])), y = Math.min(...points.map((p) => p[1]));
  const width = Math.max(2, Math.max(...points.map((p) => p[0])) - x), height = Math.max(2, Math.max(...points.map((p) => p[1])) - y);
  return {
    ...d,
    x,
    y,
    width,
    height,
    rotation: 0,
    points: points.map((p) => [(p[0] - x) / width, (p[1] - y) / height])
  };
}
function routeConnector(d, targets) {
  const source = targets.find((t2) => t2.id === d.sourceId), target = targets.find((t2) => t2.id === d.targetId);
  if (source && target)
    return geometry(d, connectorRoute(source, target, targets));
  const pts = d.points ?? [
    [0, 0],
    [1, 1]
  ], first = pts[0], last = pts[pts.length - 1];
  const start = [d.x + first[0] * d.width, d.y + first[1] * d.height], end = [d.x + last[0] * d.width, d.y + last[1] * d.height];
  if (source) {
    const [edge] = port(rotatedBounds(source), {
      x: end[0],
      y: end[1],
      width: 1,
      height: 1
    });
    return geometry(d, [edge, end]);
  }
  if (target) {
    const [edge] = port(rotatedBounds(target), {
      x: start[0],
      y: start[1],
      width: 1,
      height: 1
    });
    return geometry(d, [start, edge]);
  }
  return d;
}
function targetAt(point, targets) {
  return [...targets].reverse().sort((a, b) => (b.layer ?? 0) - (a.layer ?? 0)).find((t2) => contains(rotatedBounds(t2), point));
}

// src/design-tools.ts
var import_obsidian3 = require("obsidian");

// src/icon-picker.ts
var import_obsidian2 = require("obsidian");
function iconPicker(parent, selected, pick) {
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Search Obsidian icons\u2026";
  search.setAttribute("aria-label", "Search Obsidian icons");
  search.className = "cv-icon-search";
  const grid = document.createElement("div");
  grid.className = "cv-icon-grid";
  const status = document.createElement("p");
  status.className = "cv-icon-status";
  status.setAttribute("aria-live", "polite");
  const ids = (0, import_obsidian2.getIconIds)();
  const render = () => {
    const query = search.value.trim().toLowerCase();
    const found = ids.filter((id) => id.toLowerCase().includes(query));
    grid.replaceChildren();
    for (const id of found.slice(0, 60)) {
      const b = iconButton(grid, id, id, () => {
        selected = id;
        pick(id);
        grid.querySelectorAll("button").forEach((n) => n.setAttribute("aria-pressed", String(n === b)));
      });
      b.setAttribute("aria-pressed", String(selected === id));
    }
    status.textContent = found.length ? `${Math.min(60, found.length)} of ${found.length} icons${found.length > 60 ? " \u2014 refine search" : ""}` : "No matching icons";
  };
  search.oninput = render;
  parent.append(search, grid, status);
  render();
}

// src/tool-options.ts
var COLORS = [
  "currentColor",
  "#2783DE",
  "#46A171",
  "#EAC26B",
  "#D5803B",
  "#E56458",
  "#9B6BC1"
];
var PAPERS = [
  "#FFF0AD",
  "#E5F2FC",
  "#DDF1E4",
  "#FBE4E3",
  "#ECE3F5",
  "#F0EFED"
];
function defaultStyle(mode) {
  return {
    stroke: "currentColor",
    strokeWidth: mode === "highlighter" ? 24 : 2,
    opacity: mode === "highlighter" ? 0.35 : mode === "tape" ? 0.45 : 1,
    fill: mode === "tape" ? "#D5803B" : mode === "sticky" ? PAPERS[0] : mode === "label" ? PAPERS[1] : "none",
    fontSize: 18,
    sticker: "star",
    iconId: "star",
    ...mode === "highlighter" ? { stroke: "#EAC26B" } : {}
  };
}
function stylePanel(parent, kind, value, change) {
  const panel = document.createElement("div");
  panel.className = "cv-style-panel";
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "Appearance settings");
  parent.append(panel);
  const textKind = [
    "sticky",
    "label",
    "text",
    "section",
    "table",
    "code"
  ].includes(kind);
  const row = (label) => {
    const wrap = document.createElement("div");
    wrap.className = "cv-option-row";
    const caption = document.createElement("span");
    caption.textContent = label;
    wrap.append(caption);
    panel.append(wrap);
    return wrap;
  };
  const swatches = (label, colors, key) => {
    const wrap = row(label);
    const group = document.createElement("div");
    group.className = "cv-swatch-grid";
    wrap.append(group);
    for (const color of colors) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cv-color-swatch";
      b.style.setProperty(
        "--swatch",
        color === "currentColor" ? "var(--text-normal)" : color === "none" ? "transparent" : color
      );
      b.setAttribute("aria-label", label + " " + color);
      b.title = color === "none" ? "No fill" : color;
      b.setAttribute("aria-pressed", String(value[key] === color));
      b.onclick = () => {
        value = { ...value, [key]: color };
        change({ [key]: color });
        group.querySelectorAll("button").forEach((n) => n.setAttribute("aria-pressed", String(n === b)));
      };
      group.append(b);
    }
    const custom = document.createElement("input");
    custom.type = "color";
    custom.title = "Custom " + label.toLowerCase();
    custom.setAttribute("aria-label", custom.title);
    custom.value = value[key].startsWith("#") ? value[key] : "#2783DE";
    custom.onchange = () => {
      value = { ...value, [key]: custom.value };
      change({ [key]: custom.value });
      group.querySelectorAll("button").forEach((n) => n.setAttribute("aria-pressed", "false"));
    };
    group.append(custom);
  };
  const number2 = (label, key, min, max, step) => {
    const wrap = row(label);
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value[key]);
    input.setAttribute("aria-label", label);
    const output = document.createElement("output");
    const display = () => {
      output.textContent = key === "opacity" ? Math.round(Number(input.value) * 100) + "%" : input.value + " px";
    };
    display();
    input.oninput = display;
    input.onchange = () => {
      value = { ...value, [key]: Number(input.value) };
      change({ [key]: Number(input.value) });
      display();
    };
    wrap.append(input, output);
  };
  if (kind === "icon") {
    iconPicker(panel, value.iconId ?? "star", (iconId) => change({ iconId }));
    swatches("Icon color", COLORS, "stroke");
  } else if (kind === "image") {
    number2("Opacity", "opacity", 0.1, 1, 0.05);
  } else if (kind === "tape") {
    swatches("Tape color", ["#D5803B", ...PAPERS], "fill");
    number2("Opacity", "opacity", 0.1, 1, 0.05);
  } else if (kind === "sticker") {
    const stamps = row("Sticker");
    const grid = document.createElement("div");
    grid.className = "cv-sticker-grid";
    stamps.append(grid);
    for (const stamp of STICKERS) {
      const b = iconButton(grid, stamp.icon, stamp.label, () => {
        value = { ...value, sticker: stamp.id };
        change({ sticker: stamp.id });
        grid.querySelectorAll("button").forEach((n) => n.setAttribute("aria-pressed", String(n === b)));
      });
      b.style.color = stamp.color;
      b.setAttribute("aria-pressed", String(value.sticker === stamp.id));
    }
  } else {
    swatches(textKind ? "Text color" : "Stroke color", COLORS, "stroke");
    if (textKind || ["rect", "ellipse", "diamond", "triangle"].includes(kind))
      swatches("Fill", textKind ? PAPERS : ["none", ...PAPERS], "fill");
    if (textKind) number2("Font size", "fontSize", 12, 144, 1);
    else number2("Size", "strokeWidth", 1, 32, 1);
    number2("Opacity", "opacity", 0.1, 1, 0.05);
  }
  return panel;
}
function drawingStyle(d) {
  return {
    ...defaultStyle(d.kind),
    ...d,
    fill: d.fill ?? "none",
    fontSize: d.fontSize ?? 18,
    sticker: d.sticker ?? "star"
  };
}

// src/design-tools.ts
function confirmAction(app, title, message, label, confirm) {
  class Confirm extends import_obsidian3.Modal {
    onOpen() {
      this.titleEl.textContent = title;
      const p = document.createElement("p");
      p.textContent = message;
      this.contentEl.append(p);
      const row = document.createElement("div");
      row.className = "cv-confirm-actions";
      this.contentEl.append(row);
      const cancel = document.createElement("button");
      cancel.textContent = "Cancel";
      cancel.onclick = () => this.close();
      const apply = document.createElement("button");
      apply.className = "mod-warning";
      apply.textContent = label;
      apply.onclick = () => {
        this.close();
        confirm();
      };
      row.append(cancel, apply);
      cancel.focus();
    }
    onClose() {
      this.contentEl.replaceChildren();
    }
  }
  new Confirm(app).open();
}
var NS = "http://www.w3.org/2000/svg";
function drawingSVG(d) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${d.width} ${d.height}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.classList.add("cv-vector");
  let shape;
  if (d.kind === "rect") {
    shape = document.createElementNS(NS, "rect");
    shape.setAttribute("x", "1");
    shape.setAttribute("y", "1");
    shape.setAttribute("width", String(Math.max(1, d.width - 2)));
    shape.setAttribute("height", String(Math.max(1, d.height - 2)));
    shape.setAttribute("rx", "4");
  } else if (d.kind === "ellipse") {
    shape = document.createElementNS(NS, "ellipse");
    shape.setAttribute("cx", String(d.width / 2));
    shape.setAttribute("cy", String(d.height / 2));
    shape.setAttribute("rx", String(Math.max(1, d.width / 2 - 1)));
    shape.setAttribute("ry", String(Math.max(1, d.height / 2 - 1)));
  } else if (d.kind === "triangle") {
    shape = document.createElementNS(NS, "polygon");
    shape.setAttribute(
      "points",
      `${d.width / 2},1 ${d.width - 1},${d.height - 1} 1,${d.height - 1}`
    );
  } else if (d.kind === "tape") {
    shape = document.createElementNS(NS, "polygon");
    const w = d.width, h = d.height;
    shape.setAttribute(
      "points",
      `0,0 ${w},2 ${w - 5},${h * 0.25} ${w},${h * 0.5} ${w - 6},${h * 0.75} ${w},${h} 2,${h - 1} 7,${h * 0.75} 1,${h * 0.5} 6,${h * 0.25}`
    );
  } else if (d.kind === "diamond") {
    shape = document.createElementNS(NS, "polygon");
    shape.setAttribute(
      "points",
      `${d.width / 2},1 ${d.width - 1},${d.height / 2} ${d.width / 2},${d.height - 1} 1,${d.height / 2}`
    );
  } else {
    shape = document.createElementNS(NS, "path");
    const pts = d.points ?? [
      [0, 0],
      [1, 1]
    ];
    shape.setAttribute(
      "d",
      pts.map(
        (p, i) => `${i ? "L" : "M"}${(p[0] * d.width).toFixed(2)},${(p[1] * d.height).toFixed(2)}`
      ).join(" ")
    );
  }
  shape.setAttribute(
    "fill",
    ["rect", "ellipse", "diamond", "triangle", "tape"].includes(d.kind) ? d.fill ?? "none" : "none"
  );
  shape.setAttribute("stroke", d.kind === "tape" ? "none" : d.stroke);
  shape.setAttribute("stroke-width", String(d.strokeWidth));
  shape.setAttribute("stroke-linecap", "round");
  shape.setAttribute("stroke-linejoin", "round");
  shape.setAttribute("vector-effect", "non-scaling-stroke");
  shape.setAttribute("opacity", String(d.opacity));
  svg.append(shape);
  if (d.kind === "arrow" || d.kind === "connector") {
    const pts = d.points ?? [
      [0, 0],
      [1, 1]
    ];
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    const angle = Math.atan2((b[1] - a[1]) * d.height, (b[0] - a[0]) * d.width);
    const size = Math.max(12, d.strokeWidth * 3);
    const head = document.createElementNS(NS, "path");
    const x = b[0] * d.width, y = b[1] * d.height;
    head.setAttribute(
      "d",
      `M${x - size * Math.cos(angle - 0.5)},${y - size * Math.sin(angle - 0.5)} L${x},${y} L${x - size * Math.cos(angle + 0.5)},${y - size * Math.sin(angle + 0.5)}`
    );
    head.setAttribute("stroke", d.stroke);
    head.setAttribute("stroke-width", String(d.strokeWidth));
    head.setAttribute("fill", "none");
    head.setAttribute("opacity", String(d.opacity));
    head.setAttribute("vector-effect", "non-scaling-stroke");
    svg.append(head);
  }
  return svg;
}
var DesignTools = class {
  constructor(view, layer, selection, app, cb) {
    this.view = view;
    this.layer = layer;
    this.selection = selection;
    this.app = app;
    this.cb = cb;
    view.dom.classList.add("cv-design-editor");
    this.dock = document.createElement("div");
    this.dock.className = "cv-tool-dock";
    this.dock.setAttribute("role", "toolbar");
    this.dock.setAttribute("aria-label", "Note design tools");
    this.dock.dir = "ltr";
    this.dock.contentEditable = "false";
    this.dock.addEventListener("mousedown", (e) => e.stopPropagation());
    view.dom.append(this.dock);
    this.tray = document.createElement("div");
    this.tray.className = "cv-tool-tray";
    this.tray.hidden = true;
    this.dock.append(this.tray);
    this.outside = (e) => {
      if (!e.target?.closest(".cv-tool-dock"))
        this.tray.hidden = true;
    };
    view.dom.addEventListener("pointerdown", this.outside);
    this.cleanups.push(
      () => view.dom.removeEventListener("pointerdown", this.outside)
    );
    const select = iconButton(
      this.dock,
      "mouse-pointer-2",
      "Select objects",
      () => this.setMode("select")
    );
    select.dataset.tool = "select";
    const objectView = iconButton(
      this.dock,
      "hand",
      "Object view",
      () => actionMenu(objectView, [
        {
          label: "View space to the left",
          icon: "arrow-left",
          run: () => setObjectCamera(
            view.scrollDOM,
            objectCameraX(view.scrollDOM) + view.scrollDOM.clientWidth / 2
          )
        },
        {
          label: "Show selected object",
          icon: "focus",
          run: () => {
            const item = this.selection.current;
            if (item)
              revealObject(view.scrollDOM, item.bounds?.() ?? item.position());
            else this.cb.notify("Select an object first.");
          }
        },
        {
          label: "Reset object view",
          icon: "focus",
          run: () => setObjectCamera(view.scrollDOM, 0)
        },
        {
          label: "View space to the right",
          icon: "arrow-right",
          run: () => setObjectCamera(
            view.scrollDOM,
            objectCameraX(view.scrollDOM) - view.scrollDOM.clientWidth / 2
          )
        }
      ])
    );
    objectView.title = "Object view \xB7 Alt+wheel to pan objects without moving the note";
    const groups = [
      ["Draw tools", "pen-tool", ["pen", "highlighter"]],
      [
        "Shapes and lines",
        "shapes",
        [
          "rect",
          "ellipse",
          "diamond",
          "triangle",
          "line",
          "arrow",
          "connector",
          "tape"
        ]
      ],
      [
        "Notes and labels",
        "sticky-note",
        ["sticky", "label", "text", "section", "table", "code"]
      ],
      ["Stickers", "smile", ["sticker"]],
      ["Images and icons", "image-plus", ["image", "icon"]]
    ];
    for (const [label, icon, modes] of groups) {
      const b = iconButton(
        this.dock,
        icon,
        label,
        () => this.openGroup(label, [...modes])
      );
      b.dataset.group = label;
      b.setAttribute("aria-expanded", "false");
    }
    iconButton(
      this.dock,
      "settings",
      "Plugin settings",
      () => this.cb.openPreferences()
    );
    const toggle = iconButton(
      this.dock,
      "toggle-right",
      "Toggle note effects",
      () => this.cb.toggle()
    );
    toggle.dataset.persistent = "true";
    this.dock.append(this.divider());
    iconButton(this.dock, "undo-2", "Undo drawing", () => this.undo());
    iconButton(this.dock, "redo-2", "Redo drawing", () => this.redo());
    this.dock.append(this.divider());
    iconButton(
      this.dock,
      "rotate-ccw",
      "Reset entire note layout",
      () => confirmAction(
        this.app,
        "Reset this note\u2019s layout?",
        "Return floating blocks to normal text flow and remove drawings, sticky notes, labels and stickers from this note. Original Markdown will not be deleted. Annotation text is stored in plugin data, not in Markdown.",
        "Reset layout",
        () => {
          this.setMode("select");
          this.selection.select(null);
          this.history.push(this.cb.read().drawings);
          this.future = [];
          this.cb.reset();
        }
      )
    );
    this.catcher = document.createElement("div");
    this.catcher.className = "cv-drawing-catcher";
    this.catcher.hidden = true;
    this.catcher.setAttribute("aria-label", "Draw inside this note");
    view.scrollDOM.append(this.catcher);
    this.catcher.onpointerdown = (e) => this.beginDrawing(e);
    const scroll = () => {
      if (this.scrollFrame) return;
      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = 0;
        this.positionCatcher();
        this.selection.position();
      });
    };
    view.scrollDOM.addEventListener("scroll", scroll, { passive: true });
    this.cleanups.push(
      () => view.scrollDOM.removeEventListener("scroll", scroll)
    );
    const deselect = (e) => {
      if (!(e.target instanceof Element)) return;
      if (!e.target.closest(
        ".cv-floating-block,.cv-drawing-object,.cv-tool-dock,.cv-context-toolbar,.menu"
      ))
        this.selection.select(null);
    };
    view.dom.addEventListener("pointerdown", deselect);
    this.cleanups.push(
      () => view.dom.removeEventListener("pointerdown", deselect)
    );
    const outsideEditor = (e) => {
      if (e.target?.closest(
        ".modal-container,.modal,.test-modal-backdrop,.menu"
      ))
        return;
      if (!view.dom.contains(e.target)) this.selection.select(null);
    };
    view.dom.ownerDocument.addEventListener("pointerdown", outsideEditor, true);
    this.cleanups.push(
      () => view.dom.ownerDocument.removeEventListener(
        "pointerdown",
        outsideEditor,
        true
      )
    );
    const key = (e) => {
      const target = e.target;
      if (target.closest("textarea,input,select,.cm-content")) return;
      if ((e.ctrlKey || e.metaKey) && ["BracketLeft", "BracketRight"].includes(e.code) && this.selection.current) {
        e.preventDefault();
        e.stopPropagation();
        this.selection.reorder(
          e.code === "BracketRight" ? e.shiftKey ? "front" : "forward" : e.shiftKey ? "back" : "backward"
        );
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.disposeDrawing?.();
        this.setMode("select");
        this.tray.hidden = true;
        this.selection.select(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && (target.closest(".cv-tool-dock,.cv-drawing-object") || this.selection.current?.root.classList.contains("cv-drawing-object"))) {
        e.preventDefault();
        e.stopPropagation();
        (e.shiftKey ? this.redo : this.undo).call(this);
      }
    };
    view.dom.addEventListener("keydown", key, true);
    this.cleanups.push(
      () => view.dom.removeEventListener("keydown", key, true)
    );
  }
  dock;
  mode = "select";
  catcher;
  shapes = /* @__PURE__ */ new Map();
  draft = null;
  disposeDrawing = null;
  history = [];
  future = [];
  path = "";
  connectorStart = null;
  routePins = null;
  routeDrawings = null;
  routed = /* @__PURE__ */ new Map();
  options = /* @__PURE__ */ new Map();
  tray;
  outside;
  scrollFrame = 0;
  cleanups = [];
  divider() {
    const d = document.createElement("span");
    d.className = "cv-tool-divider";
    d.setAttribute("aria-hidden", "true");
    return d;
  }
  names = {
    pen: "Draw with pen",
    highlighter: "Draw with highlighter",
    tape: "Add decorative tape",
    rect: "Draw rectangle",
    ellipse: "Draw ellipse",
    diamond: "Draw diamond",
    triangle: "Draw triangle",
    line: "Draw line",
    arrow: "Draw arrow",
    connector: "Connect objects",
    sticky: "Add sticky note",
    label: "Add label",
    text: "Add text annotation",
    section: "Add section",
    table: "Add table annotation",
    code: "Add code annotation",
    sticker: "Add sticker",
    image: "Import image from computer",
    icon: "Add Obsidian icon"
  };
  openGroup(label, modes) {
    this.tray.replaceChildren();
    this.tray.hidden = false;
    const title = document.createElement("div");
    title.className = "cv-tray-title";
    title.textContent = label;
    this.tray.append(title);
    const grid = document.createElement("div");
    grid.className = "cv-tool-choices";
    this.tray.append(grid);
    const icons = {
      pen: "pencil",
      highlighter: "highlighter",
      tape: "ticket",
      rect: "square",
      ellipse: "circle",
      diamond: "diamond",
      triangle: "triangle",
      line: "minus",
      arrow: "arrow-up-right",
      connector: "workflow",
      sticky: "sticky-note",
      label: "tag",
      text: "type",
      section: "group",
      table: "table",
      code: "code",
      sticker: "stamp",
      image: "image-plus",
      icon: "search"
    };
    for (const mode of modes) {
      const b = iconButton(grid, icons[mode], this.names[mode], () => {
        if (mode === "image") {
          this.pickImage();
          return;
        }
        const close = this.mode === mode && b.getAttribute("aria-pressed") === "true";
        this.setMode(mode);
        if (!close) this.openOptions();
      });
      b.dataset.tool = mode;
      b.setAttribute("aria-pressed", String(this.mode === mode));
      const text = document.createElement("span");
      text.textContent = this.names[mode];
      b.append(text);
    }
  }
  pickImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/gif,image/webp";
    input.setAttribute("aria-label", "Choose local image");
    input.className = "cv-file-input";
    this.dock.append(input);
    input.oncancel = () => input.remove();
    input.onchange = async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;
      const path = this.cb.read().path;
      try {
        const asset = await this.cb.importImage(file, path);
        const state = this.cb.read();
        if (state.path !== path || !state.enabled || !this.dock.isConnected) {
          this.cb.notify(
            "Image copied to vault; note changed before placement. The file was kept."
          );
          return;
        }
        const s = this.view.scrollDOM;
        const value = {
          ...defaultStyle("image"),
          ...asset,
          id: crypto.randomUUID(),
          kind: "image",
          x: s.scrollLeft - objectCameraX(s) + Math.max(40, (s.clientWidth - asset.width) / 2),
          y: s.scrollTop + 100
        };
        this.commit([...state.drawings, value]);
        this.setMode("select");
        this.selection.select(this.shapes.get(value.id) ?? null);
      } catch (e) {
        this.cb.notify(String(e));
      }
    };
    input.click();
  }
  settings() {
    if (!this.options.has(this.mode))
      this.options.set(
        this.mode,
        this.cb.getDefaults()[this.mode] ?? defaultStyle(this.mode)
      );
    return this.options.get(this.mode);
  }
  openOptions() {
    if (this.mode === "select") {
      this.cb.openPreferences();
      return;
    }
    this.tray.replaceChildren();
    const title = document.createElement("div");
    title.className = "cv-tray-title";
    title.textContent = {
      pen: "Pen",
      highlighter: "Highlighter",
      sticky: "Sticky note",
      label: "Label",
      sticker: "Stickers"
    }[this.mode] ?? "Shape";
    this.tray.append(title);
    const close = iconButton(this.tray, "x", "Close tool settings", () => {
      this.tray.hidden = true;
    });
    close.classList.add("cv-tray-close");
    stylePanel(this.tray, this.mode, this.settings(), (patch) => {
      this.options.set(this.mode, { ...this.settings(), ...patch });
      this.cb.saveDefault(this.mode, this.settings());
    });
    this.tray.hidden = false;
  }
  setMode(mode) {
    if (mode !== this.mode) this.disposeDrawing?.();
    this.mode = mode;
    this.connectorStart = null;
    this.layer.querySelectorAll(".is-connector-source,.is-connector-target").forEach(
      (e) => e.classList.remove("is-connector-source", "is-connector-target")
    );
    const groupFor = {
      pen: "Draw tools",
      highlighter: "Draw tools",
      tape: "Shapes and lines",
      connector: "Shapes and lines",
      rect: "Shapes and lines",
      ellipse: "Shapes and lines",
      diamond: "Shapes and lines",
      triangle: "Shapes and lines",
      line: "Shapes and lines",
      arrow: "Shapes and lines",
      sticky: "Notes and labels",
      label: "Notes and labels",
      text: "Notes and labels",
      section: "Notes and labels",
      table: "Notes and labels",
      code: "Notes and labels",
      sticker: "Stickers",
      icon: "Images and icons"
    };
    this.dock.querySelectorAll("[data-group]").forEach(
      (b) => b.setAttribute(
        "aria-pressed",
        String(b.dataset.group === groupFor[mode])
      )
    );
    this.tray.hidden = true;
    this.layer.classList.toggle("is-drawing-mode", mode !== "select");
    if (mode !== "select") this.selection.select(null);
    for (const b of Array.from(
      this.dock.querySelectorAll("[data-tool]")
    ))
      b.setAttribute("aria-pressed", String(b.dataset.tool === mode));
    this.catcher.hidden = mode === "select" || !this.cb.read().enabled || !this.cb.read().live;
    if (!this.catcher.hidden) this.positionCatcher();
  }
  positionCatcher() {
    if (this.catcher.hidden) return;
    const s = this.view.scrollDOM;
    Object.assign(this.catcher.style, {
      left: s.scrollLeft + "px",
      top: s.scrollTop + "px",
      width: s.clientWidth + "px",
      height: s.clientHeight + "px"
    });
  }
  sync() {
    const state = this.cb.read();
    if (state.path !== this.path) {
      this.path = state.path;
      this.history = [];
      this.future = [];
      this.selection.select(null);
      this.setMode("select");
    }
    const show = state.enabled && state.live && !!state.path;
    this.dock.hidden = !state.live || !state.path;
    this.dock.classList.toggle("cv-effects-off", !state.enabled);
    const toggle = this.dock.querySelector(
      '[aria-label="Toggle note effects"]'
    );
    toggle?.setAttribute("aria-pressed", String(state.enabled));
    toggle?.setAttribute(
      "title",
      state.enabled ? "Disable note effects" : "Enable note effects"
    );
    if (toggle) (0, import_obsidian3.setIcon)(toggle, state.enabled ? "toggle-right" : "toggle-left");
    const prefs = this.cb.getPreferences();
    this.view.scrollDOM.classList.toggle("cv-dot-grid", show && prefs.dotGrid);
    this.view.scrollDOM.style.setProperty(
      "--cv-grid-spacing",
      prefs.gridSpacing + "px"
    );
    this.view.scrollDOM.style.setProperty(
      "--cv-grid-opacity",
      String(prefs.gridOpacity)
    );
    if (!show) this.setMode("select");
    for (const [id, obj] of this.shapes)
      if (!show || !state.drawings.some((d) => d.id === id)) {
        obj.destroy();
        this.shapes.delete(id);
      }
    if (state.pins !== this.routePins || state.drawings !== this.routeDrawings) {
      this.routePins = state.pins;
      this.routeDrawings = state.drawings;
      this.routed.clear();
      const targets = this.targets();
      for (const d of state.drawings)
        if (d.kind === "connector" || d.sourceId || d.targetId)
          this.routed.set(d.id, routeConnector(d, targets));
    }
    if (show)
      for (const saved of state.drawings) {
        const d = this.routed.get(saved.id) ?? saved;
        let object = this.shapes.get(d.id);
        if (!object) {
          object = new DrawingObject(
            d,
            this.view,
            this.layer,
            this.selection,
            (next) => this.change(next),
            () => this.remove(d.id),
            (text) => this.cb.recover(state.path, text),
            (path) => this.cb.imageURL(path),
            () => this.duplicate(d.id),
            () => this.tapeSticky(d.id),
            (p) => this.previewChildren(d.id, p)
          );
          this.shapes.set(d.id, object);
        }
        if (object.value !== d) object.update(d);
      }
    for (const label of ["Undo drawing", "Redo drawing"]) {
      const button = this.dock.querySelector(
        `[aria-label="${label}"]`
      );
      if (button)
        button.disabled = label === "Undo drawing" ? !this.history.length : !this.future.length;
    }
    this.selection.refreshLayers();
    this.selection.position();
  }
  change(value) {
    const all = this.cb.read().drawings, old = all.find((d) => d.id === value.id);
    if (value.parentId) {
      const parent = all.find((d) => d.id === value.parentId);
      if (old && (old.x !== value.x || old.y !== value.y))
        value = { ...value, parentId: void 0 };
      else if (parent)
        value = {
          ...value,
          rotationOffset: (value.rotation ?? 0) - (parent.rotation ?? 0)
        };
    }
    this.commit(
      all.map(
        (d) => d.id === value.id ? value : d.parentId === value.id ? tapeOnSticky(d, value) : d
      )
    );
  }
  previewTarget(id, placement) {
    const targets = this.targets().map(
      (t2) => t2.id === id && placement ? { ...t2, ...placement } : t2
    );
    for (const obj of this.shapes.values())
      if (obj.value.kind === "connector" || obj.value.sourceId || obj.value.targetId)
        obj.update(routeConnector(obj.value, targets));
  }
  previewChildren(id, placement) {
    this.previewTarget(id, placement);
    const parent = this.shapes.get(id);
    if (!parent) return;
    for (const child of this.shapes.values())
      if (child.value.parentId === id) {
        if (placement)
          child.previewPlacement(
            tapeOnSticky(child.value, { ...parent.value, ...placement })
          );
        else child.update(child.value);
      }
  }
  tapeSticky(id) {
    const parent = this.cb.read().drawings.find((d) => d.id === id);
    if (!parent) return;
    const tape = tapeOnSticky(
      {
        ...this.options.get("tape") ?? this.cb.getDefaults().tape ?? defaultStyle("tape"),
        id: crypto.randomUUID(),
        kind: "tape",
        x: 0,
        y: 0,
        width: Math.min(140, parent.width * 0.65),
        height: 32,
        rotationOffset: -8
      },
      parent
    );
    this.commit([...this.cb.read().drawings, tape]);
    this.selection.select(this.shapes.get(tape.id) ?? null);
  }
  duplicate(id) {
    const old = this.cb.read().drawings.find((d) => d.id === id);
    if (!old) return;
    const next = {
      ...old,
      id: crypto.randomUUID(),
      x: limit(old.x + 32, -5e4, 5e4),
      y: limit(old.y + 32, 0, 5e4),
      parentId: void 0
    };
    this.commit([...this.cb.read().drawings, next]);
    this.selection.select(this.shapes.get(next.id) ?? null);
  }
  remove(id) {
    this.commit(
      this.cb.read().drawings.filter(
        (d) => d.id !== id && d.parentId !== id && d.sourceId !== id && d.targetId !== id
      )
    );
    this.dock.querySelector("[data-tool=select]")?.focus({ preventScroll: true });
  }
  commit(next) {
    const state = this.cb.read(), ids = new Set(state.drawings.map((d) => d.id));
    let top = Math.max(
      0,
      ...state.pins.map((p) => p.layer ?? 0),
      ...state.drawings.map((d) => d.layer ?? 0)
    );
    next = next.map((d) => ids.has(d.id) ? d : { ...d, layer: ++top });
    this.history.push(this.cb.read().drawings);
    if (this.history.length > 40) this.history.shift();
    this.future = [];
    this.cb.setDrawings(next);
  }
  undo() {
    const previous = this.history.pop();
    if (!previous) return;
    this.future.push(this.cb.read().drawings);
    this.cb.setDrawings(previous);
  }
  redo() {
    const next = this.future.pop();
    if (!next) return;
    this.history.push(this.cb.read().drawings);
    this.cb.setDrawings(next);
  }
  point(e) {
    const rect = this.view.scrollDOM.getBoundingClientRect();
    return [
      limit(
        e.clientX - rect.left - this.view.scrollDOM.clientLeft + this.view.scrollDOM.scrollLeft - objectCameraX(this.view.scrollDOM),
        -5e4,
        5e4
      ),
      limit(e.clientY - rect.top + this.view.scrollDOM.scrollTop, 0, 5e4)
    ];
  }
  targets() {
    const state = this.cb.read();
    return [
      ...state.pins,
      ...state.drawings.filter(
        (d) => !["connector", "line", "arrow", "pen", "tape"].includes(d.kind)
      )
    ];
  }
  connectAt(event) {
    const target = targetAt(this.point(event), this.targets());
    if (!target) {
      this.cb.notify("Click a shape or text block to connect it.");
      return;
    }
    if (!this.connectorStart) {
      this.connectorStart = target.id;
      this.layer.querySelectorAll(".cv-drawing-object,.cv-floating-block").forEach(
        (el) => el.classList.toggle(
          "is-connector-source",
          el.dataset.id === target.id
        )
      );
      this.cb.notify("Now click the destination object.");
      return;
    }
    if (this.connectorStart === target.id) return;
    const sourceId = this.connectorStart;
    const value = routeConnector(
      {
        ...this.settings(),
        id: crypto.randomUUID(),
        kind: "connector",
        sourceId,
        targetId: target.id,
        x: 0,
        y: 0,
        width: 2,
        height: 2
      },
      this.targets()
    );
    this.commit([...this.cb.read().drawings, value]);
    this.setMode("select");
    this.selection.select(this.shapes.get(value.id) ?? null);
  }
  beginDrawing(event) {
    if (event.button !== 0 || this.mode === "select") return;
    event.preventDefault();
    event.stopPropagation();
    this.disposeDrawing?.();
    this.tray.hidden = true;
    const mode = this.mode;
    if (mode === "connector") {
      this.connectAt(event);
      return;
    }
    const settings = { ...this.settings() };
    if ([
      "sticky",
      "label",
      "sticker",
      "tape",
      "icon",
      "text",
      "section",
      "table",
      "code"
    ].includes(mode)) {
      const [x, y] = this.point(event);
      const value2 = {
        id: crypto.randomUUID(),
        kind: mode,
        x,
        y,
        width: ["sticker", "icon"].includes(mode) ? 80 : mode === "tape" ? 160 : ["section", "table", "code"].includes(mode) ? 400 : mode === "label" ? 180 : 240,
        height: ["sticker", "icon"].includes(mode) ? 80 : mode === "tape" ? 36 : mode === "label" || mode === "text" ? 64 : 200,
        ...settings,
        text: mode === "sticky" ? "Your idea\u2026" : mode === "label" ? "Label" : mode === "text" ? "Text" : mode === "section" ? "Section" : mode === "table" ? "First cell	Second cell\nThird cell	Fourth cell" : mode === "code" ? 'const idea = "space to think";' : ""
      };
      this.commit([...this.cb.read().drawings, value2]);
      this.setMode("select");
      const object = this.shapes.get(value2.id);
      this.selection.select(object ?? null);
      if (["sticky", "label", "text", "section", "table", "code"].includes(mode))
        object?.editText();
      return;
    }
    const kind = mode === "highlighter" ? "pen" : mode;
    const points = [this.point(event)];
    let frame = 0;
    let ended = false;
    let value = null;
    this.draft = document.createElement("div");
    this.draft.className = "cv-drawing-preview";
    this.layer.append(this.draft);
    const paint = () => {
      frame = 0;
      value = drawingFromPoints(
        kind,
        points,
        settings.stroke,
        settings.strokeWidth,
        settings.opacity
      );
      if (!value || !this.draft) return;
      value.fill = settings.fill;
      Object.assign(this.draft.style, {
        left: value.x + "px",
        top: value.y + "px",
        width: value.width + "px",
        height: value.height + "px"
      });
      this.draft.replaceChildren(drawingSVG(value));
    };
    const move = (e) => {
      if (e.pointerId !== event.pointerId) return;
      const p = this.point(e);
      if (kind === "pen") {
        const last = points[points.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
        if (points.length < 5e3) points.push(p);
        else points[points.length - 1] = p;
      } else points[1] = p;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const finish = (cancel) => {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancelEvent);
      window.removeEventListener("blur", blur);
      if (!cancel) paint();
      this.draft?.remove();
      this.draft = null;
      this.disposeDrawing = null;
      if (!cancel && value) {
        const id = value.id;
        this.commit([...this.cb.read().drawings, value]);
        this.selection.select(this.shapes.get(id) ?? null);
      }
    };
    const up = (e) => {
      if (e.pointerId === event.pointerId) {
        move(e);
        finish(false);
      }
    };
    const cancelEvent = (e) => {
      if (e.pointerId === event.pointerId) finish(true);
    };
    const blur = () => finish(true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancelEvent);
    window.addEventListener("blur", blur);
    this.disposeDrawing = () => finish(true);
  }
  destroy() {
    this.disposeDrawing?.();
    cancelAnimationFrame(this.scrollFrame);
    this.cleanups.forEach((f) => f());
    this.shapes.forEach((o) => o.destroy());
    this.shapes.clear();
    this.catcher.remove();
    this.view.scrollDOM.classList.remove("cv-dot-grid");
    this.dock.remove();
    this.view.dom.classList.remove("cv-design-editor");
  }
};
var DrawingObject = class {
  constructor(value, view, parent, selection, change, remove, recover, imageURL2, duplicate, addTape, children) {
    this.value = value;
    this.view = view;
    this.selection = selection;
    this.change = change;
    this.remove = remove;
    this.recover = recover;
    this.imageURL = imageURL2;
    this.duplicate = duplicate;
    this.addTape = addTape;
    this.children = children;
    this.id = value.id;
    this.selection.register(this);
    this.root = document.createElement("div");
    this.root.className = "cv-drawing-object";
    this.root.dataset.id = value.id;
    this.root.tabIndex = 0;
    this.root.onfocus = () => this.selection.select(this);
    this.root.addEventListener("focusin", () => this.selection.select(this));
    this.root.setAttribute("aria-label", value.kind + " drawing");
    parent.append(this.root);
    this.toolbar = document.createElement("div");
    this.toolbar.className = "cv-context-toolbar";
    this.toolbar.setAttribute("role", "toolbar");
    this.toolbar.setAttribute("aria-label", "Selected drawing tools");
    this.root.append(this.toolbar);
    const grip = iconButton(
      this.toolbar,
      "move",
      "Move drawing",
      () => this.select()
    );
    grip.onpointerdown = (e) => this.gesture(e);
    grip.onkeydown = (e) => this.key(e);
    if (![
      "sticky",
      "label",
      "sticker",
      "image",
      "icon",
      "text",
      "section",
      "tape",
      "table",
      "code"
    ].includes(value.kind)) {
      iconButton(
        this.toolbar,
        "palette",
        "Drawing color",
        () => this.properties("color")
      );
      iconButton(
        this.toolbar,
        "sliders-horizontal",
        "Brush thickness",
        () => this.properties("width")
      );
    }
    if (["sticky", "label", "text", "section", "table", "code"].includes(
      value.kind
    ))
      iconButton(
        this.toolbar,
        "pencil",
        "Edit annotation text",
        () => this.editText()
      );
    iconButton(
      this.toolbar,
      "settings-2",
      "Object appearance",
      () => this.properties("all")
    );
    const del = iconButton(
      this.toolbar,
      "trash-2",
      "Delete this drawing",
      () => this.remove()
    );
    del.classList.add("cv-danger");
    if (value.kind === "sticky")
      iconButton(
        this.toolbar,
        "tape",
        "Add tape to sticky",
        () => this.addTape()
      );
    iconButton(
      this.toolbar,
      "copy",
      "Duplicate object",
      () => this.duplicate()
    );
    this.frame = document.createElement("div");
    this.frame.className = "cv-rotated-frame";
    this.root.append(this.frame);
    this.updateGrip = leftGrip(
      this.root,
      () => this.value,
      (e) => this.gesture(e),
      (e) => this.key(e),
      () => this.menu()
    );
    this.cancelRotate = rotationHandle(
      this.root,
      this.frame,
      () => this.value,
      (n) => {
        this.change({ ...this.value, rotation: n });
        this.selection.position();
      },
      (p) => this.children(p)
    );
    this.visual = document.createElement("div");
    this.visual.className = "cv-drawing-visual";
    this.frame.append(this.visual);
    addHandles(
      this.frame,
      (e, h) => this.gesture(e, h),
      (e, h) => this.key(e, h)
    );
    this.root.onpointerdown = (e) => {
      if (e.target.closest(
        "button,input,textarea,.cv-property-popover"
      ))
        return;
      this.gesture(e);
    };
    this.root.ondblclick = () => this.editText();
    bindContextMenu(this.root, (point) => this.menu(point));
    this.root.onkeydown = (e) => {
      if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return;
      this.key(e);
    };
    this.root.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.update(value);
  }
  root;
  toolbar;
  id;
  visual;
  editing = false;
  frame;
  updateGrip;
  alignGrip = () => this.updateGrip();
  cancelRotate;
  input = null;
  cancelGesture = null;
  previewPlacement(p) {
    Object.assign(this.root.style, {
      left: p.x + "px",
      top: p.y + "px",
      width: p.width + "px",
      height: p.height + "px"
    });
    this.frame.style.rotate = (p.rotation ?? 0) + "deg";
  }
  setLayer = (layer) => this.change({ ...this.value, layer });
  menu = (point) => {
    this.select();
    const actions = [
      {
        label: "Appearance and text size",
        icon: "palette",
        run: () => this.openSettings()
      },
      ...layerActions(this.selection, this),
      { label: "Duplicate", icon: "copy", run: () => this.duplicate() },
      { label: "Delete", icon: "trash-2", run: () => this.remove() }
    ];
    if (["sticky", "label", "text", "section", "table", "code"].includes(
      this.value.kind
    ))
      actions.unshift({
        label: "Edit text",
        icon: "pencil",
        run: () => this.editText()
      });
    if (this.value.kind !== "connector" && !this.value.sourceId && !this.value.targetId) {
      actions.splice(
        1,
        0,
        ...alignmentActions(
          this.view.scrollDOM,
          this.position,
          (p) => this.change({ ...this.value, ...p })
        ),
        {
          label: "Reset rotation",
          icon: "rotate-ccw",
          run: () => this.change({ ...this.value, rotation: 0 })
        }
      );
    }
    if (this.value.text)
      actions.unshift({
        label: "Copy text",
        icon: "clipboard-copy",
        run: () => copyText(this.value.text, (m) => new import_obsidian3.Notice(m))
      });
    actionMenu(
      this.root.querySelector(".cv-object-grip"),
      actions,
      point
    );
  };
  position = () => this.value;
  bounds = () => rotatedBounds(this.value);
  openSettings = () => this.properties("all");
  select() {
    this.selection.select(this);
    this.root.focus({ preventScroll: true });
  }
  update(value) {
    const old = this.value;
    this.value = value;
    Object.assign(this.root.style, {
      left: value.x + "px",
      top: value.y + "px",
      width: value.width + "px",
      height: value.height + "px"
    });
    this.selection.refreshLayers();
    this.frame.style.rotate = (value.rotation ?? 0) + "deg";
    this.root.classList.toggle(
      "is-attached-connector",
      value.kind === "connector" || !!value.sourceId || !!value.targetId
    );
    this.updateGrip();
    if (this.input) this.input.style.fontSize = (value.fontSize ?? 18) + "px";
    if (!this.editing && (!this.visual.firstChild || old !== value))
      this.render();
  }
  render() {
    const d = this.value;
    this.root.dataset.kind = d.kind;
    if (d.kind === "table") {
      const table = document.createElement("table");
      table.className = "cv-annotation-table";
      for (const line of (d.text ?? "").split("\n").slice(0, 16)) {
        const row = table.insertRow();
        for (const cell of line.split("	").slice(0, 16)) {
          const td = row.insertCell();
          td.textContent = cell;
          td.dir = "auto";
        }
      }
      Object.assign(table.style, {
        fontSize: (d.fontSize ?? 18) + "px",
        color: d.stroke,
        background: d.fill && d.fill !== "none" ? d.fill : "var(--background-primary)",
        opacity: String(d.opacity)
      });
      this.visual.replaceChildren(table);
    } else if (d.kind === "code") {
      const pre = document.createElement("pre");
      pre.className = "cv-code-annotation";
      pre.textContent = d.text ?? "";
      Object.assign(pre.style, {
        fontSize: (d.fontSize ?? 16) + "px",
        color: d.stroke,
        background: d.fill && d.fill !== "none" ? d.fill : "var(--background-secondary)",
        opacity: String(d.opacity)
      });
      this.visual.replaceChildren(pre);
    } else if (["sticky", "label", "text", "section"].includes(d.kind)) {
      const text = document.createElement("div");
      text.className = "cv-annotation-text";
      text.dir = "auto";
      text.textContent = d.text ?? "";
      Object.assign(text.style, {
        background: d.fill && d.fill !== "none" ? d.fill : ["text", "section"].includes(d.kind) ? "transparent" : "#FFF0AD",
        color: d.stroke === "currentColor" ? ["text", "section"].includes(d.kind) ? "var(--text-normal)" : "#2C2C2B" : d.stroke,
        fontSize: (d.fontSize ?? 18) + "px",
        opacity: String(d.opacity)
      });
      this.visual.replaceChildren(text);
    } else if (d.kind === "image") {
      const img = document.createElement("img");
      img.alt = d.text || "Imported image";
      img.draggable = false;
      const url = d.assetPath ? this.imageURL(d.assetPath) : "";
      if (url) img.src = url;
      else img.alt = "Image file missing from vault";
      img.style.opacity = String(d.opacity);
      this.visual.replaceChildren(img);
    } else if (d.kind === "icon") {
      const el = document.createElement("div");
      el.className = "cv-placed-icon";
      el.style.color = d.stroke;
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", d.iconId ?? "star");
      (0, import_obsidian3.setIcon)(el, d.iconId ?? "star");
      this.visual.replaceChildren(el);
    } else if (d.kind === "sticker") {
      const stamp = STICKERS.find((s) => s.id === d.sticker) ?? STICKERS[0];
      const el = document.createElement("div");
      el.className = "cv-stamp-art";
      el.style.color = stamp.color;
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", stamp.label);
      (0, import_obsidian3.setIcon)(el, stamp.icon);
      this.visual.replaceChildren(el);
    } else this.visual.replaceChildren(drawingSVG(d));
  }
  editText() {
    if (this.editing || !["sticky", "label", "text", "section", "table", "code"].includes(
      this.value.kind
    ))
      return;
    this.select();
    this.editing = true;
    this.root.classList.add("is-editing");
    this.toolbar.querySelector(".cv-property-popover")?.remove();
    const wrap = document.createElement("div");
    wrap.className = "cv-annotation-edit";
    const input = document.createElement("textarea");
    this.input = input;
    input.dir = "auto";
    input.value = this.value.text ?? "";
    input.maxLength = 1e4;
    input.setAttribute("aria-label", "Annotation text");
    input.style.fontSize = (this.value.fontSize ?? 18) + "px";
    const row = document.createElement("div");
    row.className = "cv-annotation-actions";
    const editButton = this.toolbar.querySelector(
      '[aria-label="Edit annotation text"]'
    );
    if (editButton) editButton.hidden = true;
    this.toolbar.append(row);
    const finish = (save) => {
      const text = input.value;
      this.editing = false;
      this.input = null;
      this.root.classList.remove("is-editing");
      row.remove();
      if (editButton) editButton.hidden = false;
      if (save && text !== this.value.text)
        this.change({ ...this.value, text });
      this.render();
      this.root.focus({ preventScroll: true });
    };
    iconButton(row, "check", "Save annotation", () => finish(true));
    iconButton(row, "x", "Cancel annotation edit", () => finish(false));
    input.onkeydown = (e) => {
      if (e.isComposing) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        finish(true);
      }
    };
    wrap.append(input);
    this.visual.replaceChildren(wrap);
    input.focus({ preventScroll: true });
    input.select();
    this.selection.position();
  }
  properties(type) {
    this.root.querySelector(".cv-property-popover")?.remove();
    const menu = document.createElement("div");
    menu.className = "cv-property-popover";
    menu.setAttribute("role", "group");
    menu.setAttribute(
      "aria-label",
      type === "all" ? "Object appearance settings" : type === "color" ? "Stroke colors" : "Brush weights"
    );
    this.toolbar.append(menu);
    if (type === "all") {
      menu.classList.add("cv-full-properties");
      if (this.value.kind !== "connector" && !this.value.sourceId && !this.value.targetId)
        rotationField(menu, this.value.rotation ?? 0, (n) => {
          this.change({ ...this.value, rotation: n });
          this.selection.position();
        });
      stylePanel(
        menu,
        this.value.kind,
        drawingStyle(this.value),
        (patch) => this.change({ ...this.value, ...patch })
      );
    } else if (type === "color") {
      for (const color of [
        "currentColor",
        "#2783DE",
        "#46A171",
        "#D5803B",
        "#E56458"
      ]) {
        const b = document.createElement("button");
        b.className = "cv-color-swatch";
        b.style.setProperty(
          "--swatch",
          color === "currentColor" ? "var(--text-normal)" : color
        );
        b.setAttribute("aria-label", "Stroke " + color);
        b.setAttribute("aria-pressed", String(this.value.stroke === color));
        b.onclick = () => {
          this.change({ ...this.value, stroke: color });
          menu.remove();
        };
        menu.append(b);
      }
    } else
      for (const width of [2, 4, 8, 16]) {
        const b = document.createElement("button");
        b.textContent = String(width);
        b.setAttribute("aria-label", "Stroke width " + width);
        b.setAttribute(
          "aria-pressed",
          String(this.value.strokeWidth === width)
        );
        b.onclick = () => {
          this.change({ ...this.value, strokeWidth: width });
          menu.remove();
        };
        menu.append(b);
      }
    this.selection.position();
    const rect = this.view.scrollDOM.getBoundingClientRect();
    const bar = this.toolbar.getBoundingClientRect();
    menu.style.left = limit(
      0,
      rect.left + 8 - bar.left,
      rect.right - 8 - bar.left - menu.offsetWidth
    ) + "px";
    menu.style.top = limit(
      bar.height + 6,
      rect.top + 8 - bar.top,
      rect.bottom - 8 - bar.top - menu.offsetHeight
    ) + "px";
  }
  gesture(e, h) {
    if (e.button !== 0) return;
    if (this.value.kind === "connector") {
      this.select();
      return;
    }
    this.toolbar.querySelector(".cv-property-popover")?.remove();
    this.select();
    this.cancelGesture?.();
    const start = { ...this.value };
    this.cancelGesture = previewGesture(e, {
      scroller: this.view.scrollDOM,
      root: this.root,
      start,
      explicitHeight: true,
      autoPan: !h,
      preview: (p) => this.children(p),
      finishPreview: () => this.children(null),
      project: (dx, dy) => h ? rotatedResize(start, dx, dy, h) : {
        ...start,
        x: limit(start.x + dx, -5e4, 5e4),
        y: limit(start.y + dy, 0, 5e4)
      },
      commit: (p) => {
        this.change({ ...this.value, ...p });
        this.selection.position();
      },
      end: () => this.cancelGesture = null
    });
  }
  key(e, h) {
    if (e.target.closest("input,textarea,select")) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      this.remove();
      return;
    }
    if (e.key === "Escape") {
      this.selection.select(null);
      return;
    }
    const d = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    };
    if (!d[e.key] || this.value.kind === "connector") return;
    e.preventDefault();
    e.stopPropagation();
    this.select();
    const [dx, dy] = d[e.key].map((n) => n * (e.shiftKey ? 10 : 1));
    this.change({
      ...this.value,
      ...h ? rotatedResize(this.value, dx, dy, h) : {
        x: limit(this.value.x + dx, -5e4, 5e4),
        y: limit(this.value.y + dy, 0, 5e4)
      }
    });
    revealObject(this.view.scrollDOM, this.bounds());
    this.selection.position();
  }
  destroy() {
    this.root.dispatchEvent(new Event("cv-destroy"));
    this.cancelRotate();
    if (this.editing && this.input && this.input.value !== this.value.text)
      this.recover(this.input.value);
    this.cancelGesture?.();
    this.selection.remove(this);
    this.root.remove();
  }
};

// src/spatial.ts
var action = import_state.StateEffect.define();
var fields = /* @__PURE__ */ new WeakMap();
var live = (state) => state.field(import_obsidian4.editorLivePreviewField, false) === true;
var pathOf = (state) => state.field(import_obsidian4.editorInfoField, false)?.file?.path ?? "";
var Hidden = class extends import_view.WidgetType {
  toDOM() {
    const el = document.createElement("span");
    el.className = "cv-source-placeholder";
    el.setAttribute("aria-hidden", "true");
    return el;
  }
  get estimatedHeight() {
    return 0;
  }
  ignoreEvent() {
    return true;
  }
};
var Space = class extends import_view.WidgetType {
  constructor(height) {
    super();
    this.height = height;
  }
  eq(other) {
    return this.height === other.height;
  }
  toDOM() {
    const el = document.createElement("div");
    el.className = "cv-space";
    el.style.height = this.height + "px";
    el.setAttribute("aria-hidden", "true");
    return el;
  }
  get estimatedHeight() {
    return this.height;
  }
  ignoreEvent() {
    return true;
  }
};
function reserve(value) {
  return Math.ceil(
    Math.max(
      800,
      ...value.pins.map((p) => {
        const b = rotatedBounds(p);
        return b.y + b.height + 160;
      }),
      ...value.drawings.map((d) => {
        const b = rotatedBounds(d);
        return b.y + b.height + 160;
      })
    ) / 512
  ) * 512;
}
function decorate(value, length) {
  if (!value.enabled || !value.live || !value.pins.length && !value.drawings.length)
    return import_view.Decoration.none;
  const ranges = value.pins.map(
    (p) => import_view.Decoration.replace({ block: true, widget: new Hidden() }).range(
      p.from,
      p.to
    )
  );
  const height = reserve(value);
  ranges.push(
    import_view.Decoration.widget({
      block: true,
      side: 1,
      widget: new Space(height)
    }).range(length)
  );
  return import_view.Decoration.set(ranges, true);
}
function createSpatialExtension(host) {
  const field = import_state.StateField.define({
    create(state) {
      const path = pathOf(state);
      const saved = host.store.notes[path];
      const restored = restore(saved?.pins ?? [], state.doc.toString());
      const value = {
        path,
        enabled: saved?.enabled ?? true,
        live: live(state),
        drawings: saved?.drawings ?? [],
        ...restored,
        decorations: import_view.Decoration.none
      };
      value.decorations = decorate(value, state.doc.length);
      return value;
    },
    update(old, tr) {
      const path = pathOf(tr.state);
      const isLive = live(tr.state);
      const effects = tr.effects.filter((e) => e.is(action));
      if (!tr.docChanged && !effects.length && path === old.path && isLive === old.live)
        return old;
      let value = {
        ...old,
        pins: old.pins,
        live: live(tr.state)
      };
      if (path !== old.path) {
        const saved = host.store.notes[path];
        value = {
          ...value,
          path,
          enabled: saved?.enabled ?? true,
          drawings: saved?.drawings ?? [],
          ...restore(saved?.pins ?? [], tr.state.doc.toString())
        };
      } else if (tr.docChanged) {
        const next = [];
        const uncertain = [];
        for (const p of old.pins) {
          let crossesBoundary = false;
          tr.changes.iterChangedRanges((a, b) => {
            if (a < p.to && b > p.from && (a < p.from || b > p.to))
              crossesBoundary = true;
          });
          if (crossesBoundary) {
            uncertain.push(capture(p, tr.startState.doc.toString()));
            continue;
          }
          const from = tr.changes.mapPos(p.from, -1);
          const to = tr.changes.mapPos(p.to, 1);
          if (to > from)
            next.push({
              ...p,
              from,
              to,
              text: tr.state.doc.sliceString(from, to)
            });
        }
        const resolved = restore(uncertain, tr.state.doc.toString());
        for (const p of resolved.pins) {
          if (!next.some((n) => p.from < n.to && p.to > n.from)) next.push(p);
          else resolved.detached.push(capture(p, tr.state.doc.toString()));
        }
        value.pins = next;
        value.detached = [...old.detached, ...resolved.detached];
      }
      for (const effect of tr.effects) {
        if (!effect.is(action)) continue;
        const a = effect.value;
        if (a.type === "add" && !value.pins.some((p) => a.pin.from < p.to && a.pin.to > p.from))
          value = {
            ...value,
            enabled: true,
            pins: [
              ...value.pins,
              {
                ...a.pin,
                layer: Math.max(
                  0,
                  ...value.pins.map((p) => p.layer ?? 0),
                  ...value.drawings.map((d) => d.layer ?? 0)
                ) + 1
              }
            ]
          };
        if (a.type === "remove")
          value = {
            ...value,
            pins: value.pins.filter((p) => p.id !== a.id),
            drawings: value.drawings.filter(
              (d) => d.sourceId !== a.id && d.targetId !== a.id
            )
          };
        if (a.type === "place")
          value = {
            ...value,
            pins: value.pins.map(
              (p) => p.id === a.id ? { ...p, ...a.placement } : p
            )
          };
        if (a.type === "layers")
          value = {
            ...value,
            pins: value.pins.map((p) => ({
              ...p,
              layer: a.layers[p.id] ?? p.layer
            })),
            drawings: value.drawings.map((d) => ({
              ...d,
              layer: a.layers[d.id] ?? d.layer
            }))
          };
        if (a.type === "toggle") value = { ...value, enabled: !value.enabled };
        if (a.type === "drawings")
          value = {
            ...value,
            drawings: a.drawings,
            enabled: true
          };
        if (a.type === "reset")
          value = {
            ...value,
            pins: [],
            detached: [],
            drawings: [],
            enabled: true
          };
      }
      if (tr.docChanged) {
        const removed = new Set(
          old.pins.filter((p) => !value.pins.some((n) => n.id === p.id)).map((p) => p.id)
        );
        if (removed.size)
          value.drawings = value.drawings.filter(
            (d) => !removed.has(d.sourceId ?? "") && !removed.has(d.targetId ?? "")
          );
      }
      const sourceRangesChanged = tr.docChanged || path !== old.path || effects.some(
        (e) => e.is(action) && ["add", "remove", "reset", "toggle"].includes(e.value.type)
      );
      if (sourceRangesChanged || value.live !== old.live || reserve(value) !== reserve(old) || !old.drawings.length !== !value.drawings.length)
        value.decorations = decorate(value, tr.state.doc.length);
      return value;
    },
    provide: (f) => [
      import_view.EditorView.decorations.from(f, (v) => v.decorations),
      import_view.EditorView.atomicRanges.of((view) => {
        const v = view.state.field(f);
        if (!v.enabled || !v.live) return import_view.Decoration.none;
        return import_view.Decoration.set(
          v.pins.map((p) => import_view.Decoration.replace({}).range(p.from, p.to)),
          true
        );
      })
    ]
  });
  const plugin = import_view.ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.view = view;
        fields.set(view, field);
        host.views.add(view);
        view.scrollDOM.classList.add("cv-spatial-scroller");
        this.layer = document.createElement("div");
        this.layer.className = "cv-spatial-layer";
        this.layer.contentEditable = "false";
        this.camera = new ObjectCamera(
          view.dom,
          view.scrollDOM,
          this.layer,
          (x) => {
            this.selection?.position();
            const path = view.state.field(field).path, note = host.store.notes[path];
            if (note) {
              note.viewX = x;
              host.scheduleSave();
            }
          }
        );
        view.dom.addEventListener("wheel", this.wheel, { passive: false });
        this.controls = document.createElement("div");
        this.controls.className = "cv-source-controls";
        this.controls.contentEditable = "false";
        view.dom.append(this.controls);
        this.selection = new Selection(
          view.scrollDOM,
          (layers) => view.dispatch({ effects: action.of({ type: "layers", layers }) })
        );
        this.tools = new DesignTools(
          view,
          this.layer,
          this.selection,
          host.app,
          {
            read: () => view.state.field(field),
            getPreferences: () => normalizePreferences(host.store.settings),
            openPreferences: () => host.openPreferences(),
            toggle: () => view.dispatch({ effects: action.of({ type: "toggle" }) }),
            importImage: (file, path) => host.importImage(file, path),
            imageURL: (path) => host.imageURL(path),
            notify: (message) => host.notify(message),
            getDefaults: () => host.store.toolDefaults ?? {},
            saveDefault: (mode, style) => {
              host.store.toolDefaults = {
                ...host.store.toolDefaults,
                [mode]: style
              };
              host.scheduleSave();
            },
            recover: (path, text) => {
              host.store.recoveryDrafts ??= [];
              host.store.recoveryDrafts.push({
                id: crypto.randomUUID(),
                path,
                text,
                savedAt: (/* @__PURE__ */ new Date()).toISOString()
              });
              host.scheduleSave();
              host.notify(
                "An unfinished annotation draft was saved. Use Canvsidian: Recover interrupted block drafts."
              );
            },
            setDrawings: (drawings) => view.dispatch({
              effects: action.of({ type: "drawings", drawings })
            }),
            reset: () => view.dispatch({ effects: action.of({ type: "reset" }) })
          }
        );
        this.handle = document.createElement("button");
        this.handle.className = "cv-float-handle";
        (0, import_obsidian4.setIcon)(this.handle, "grip-vertical");
        this.handle.title = "Drag this block out of the text flow";
        this.handle.setAttribute("aria-label", "Float block under pointer");
        this.controls.append(this.handle);
        this.handle.hidden = true;
        this.handle.onpointerleave = (event) => {
          if (!view.scrollDOM.contains(event.relatedTarget))
            this.hideHover();
        };
        this.cancelGrip = gripInteraction(
          this.handle,
          (e) => {
            if (this.hoverPos === null) return;
            const pin = floatAt(view, host, this.hoverPos);
            if (pin) this.cards.get(pin.id)?.beginDrag(e, true);
            this.hideHover();
          },
          () => this.sourceMenu()
        );
        bindContextMenu(this.handle, (point) => this.sourceMenu(point));
        view.scrollDOM.addEventListener("mousemove", this.onGutterMove);
        view.scrollDOM.addEventListener("mouseleave", this.onGutterLeave);
        this.sync(true);
      }
      layer;
      handle;
      cards = /* @__PURE__ */ new Map();
      selection;
      tools;
      cachedDoc = null;
      cachedSource = "";
      savedPins = /* @__PURE__ */ new Map();
      hoverPos = null;
      cancelGrip;
      controls;
      camera;
      cameraPath = "";
      wheel = (event) => {
        const state = this.view.state.field(field);
        if (!event.altKey || event.ctrlKey || event.metaKey || !state.enabled || !state.live || !state.pins.length && !state.drawings.length)
          return;
        event.preventDefault();
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.view.scrollDOM.clientWidth : 1;
        this.camera.set(this.camera.x - (event.deltaX || event.deltaY) * unit);
      };
      destroyed = false;
      hoverFrame = 0;
      hoverEvent = null;
      onGutterMove = (event) => this.queueHover(event);
      onGutterLeave = (event) => {
        if (!this.handle.contains(event.relatedTarget))
          this.hideHover();
      };
      parsedDoc = null;
      parsedBlocks = [];
      update(update) {
        const before = update.startState.field(field);
        const next = update.state.field(field);
        if (before !== next) {
          this.sync(false);
          if (update.docChanged || before.pins !== next.pins || before.drawings !== next.drawings || before.enabled !== next.enabled || before.path !== next.path)
            this.persist();
        }
        if (update.docChanged || update.viewportChanged) this.hideHover();
      }
      sync(initial) {
        const state = this.view.state.field(field);
        const shown = state.enabled && state.live && !!state.path;
        if (state.path !== this.cameraPath) {
          this.cameraPath = state.path;
          this.camera.set(host.store.notes[state.path]?.viewX ?? 0, false);
        }
        if (!state.pins.length && !state.drawings.length)
          this.camera.set(0, false);
        this.camera.viewport.hidden = !shown;
        this.layer.hidden = !shown;
        this.camera.layout();
        if (!shown) this.hideHover();
        for (const [id, card] of this.cards)
          if (!shown || !state.pins.some((p) => p.id === id)) {
            card.destroy();
            this.cards.delete(id);
          }
        if (shown)
          for (const pin of state.pins) {
            let card = this.cards.get(pin.id);
            if (!card) {
              card = new FloatingBlock(
                this.view,
                host,
                pin,
                this.layer,
                () => this.persist(),
                this.selection,
                (p) => this.tools.previewTarget(pin.id, p)
              );
              this.cards.set(pin.id, card);
              this.selection.select(card);
            }
            if (card.pin !== pin || !card.root.style.width) card.update(pin);
          }
        this.tools.sync();
        this.selection.refreshLayers();
        this.selection.position();
        if (initial && state.detached.length)
          host.notify(
            `${state.detached.length} Canvsidian placement(s) could not be matched safely. Their text remains visible; saved placement has been retained.`
          );
      }
      persist() {
        const state = this.view.state.field(field);
        if (!state.path) return;
        const changed = this.cachedDoc !== this.view.state.doc;
        if (changed) {
          this.cachedDoc = this.view.state.doc;
          this.cachedSource = this.view.state.doc.toString();
          this.savedPins.clear();
        }
        const currentIds = new Set(state.pins.map((p) => p.id));
        for (const id of this.savedPins.keys())
          if (!currentIds.has(id)) this.savedPins.delete(id);
        const saved = state.pins.map((p) => {
          const previous = this.savedPins.get(p.id);
          const value = previous ? { ...previous, ...p } : capture(p, this.cachedSource);
          this.savedPins.set(p.id, value);
          return value;
        });
        host.store.notes[state.path] = {
          enabled: state.enabled,
          viewX: this.camera.x,
          pins: [...saved, ...state.detached],
          drawings: state.drawings
        };
        host.scheduleSave();
      }
      hideHover() {
        cancelAnimationFrame(this.hoverFrame);
        this.hoverFrame = 0;
        this.hoverEvent = null;
        this.handle.hidden = true;
      }
      sourceMenu(point) {
        if (this.hoverPos === null) return;
        const block = blockAt(this.view.state.doc.toString(), this.hoverPos);
        if (!block) return;
        const originalDoc = this.view.state.doc;
        const valid = () => {
          if (this.view.state.doc === originalDoc) return true;
          host.notify(
            "This block changed while its menu was open. Reopen the block menu before editing it."
          );
          return false;
        };
        const float = () => {
          const p = floatAt(this.view, host, block.from);
          return p ? this.cards.get(p.id) : void 0;
        };
        actionMenu(
          this.handle,
          [
            {
              label: "Edit block",
              icon: "pencil",
              run: () => {
                this.view.dispatch({
                  selection: { anchor: block.from },
                  scrollIntoView: true
                });
                this.view.focus();
              }
            },
            {
              label: "Copy Markdown",
              icon: "clipboard-copy",
              run: () => copyText(
                this.view.state.doc.sliceString(block.from, block.to),
                (m) => host.notify(m)
              )
            },
            {
              label: "Select block text",
              icon: "text-select",
              run: () => {
                this.view.dispatch({
                  selection: { anchor: block.from, head: block.to },
                  scrollIntoView: true
                });
                this.view.focus();
              }
            },
            {
              label: "Float and move",
              icon: "move",
              run: () => {
                float();
                this.hideHover();
              }
            },
            {
              label: "Text size and color",
              icon: "palette",
              run: () => {
                float()?.openSettings();
                this.hideHover();
              }
            },
            {
              label: "Duplicate",
              icon: "copy",
              run: () => this.view.dispatch({
                changes: { from: block.to, insert: "\n\n" + block.text }
              })
            },
            {
              label: "Delete",
              icon: "trash-2",
              run: () => confirmAction(
                host.app,
                "Delete this block?",
                "Remove this block's Markdown from this note. Use text undo to restore it.",
                "Delete block",
                () => {
                  if (valid())
                    this.view.dispatch({
                      changes: { from: block.from, to: block.to }
                    });
                }
              )
            }
          ].map((item) => ({
            ...item,
            run: () => {
              if (valid()) item.run();
            }
          })),
          point
        );
      }
      hover(event) {
        const state = this.view.state.field(field);
        if (!state.enabled || !state.live || this.view.scrollDOM.classList.contains("cv-has-gesture")) {
          this.hideHover();
          return;
        }
        if (event.target?.closest(".cv-float-handle,.menu"))
          return;
        if (event.target?.closest(
          ".cv-floating-block,.cv-drawing-object,.cv-tool-dock"
        )) {
          this.hideHover();
          return;
        }
        const content2 = this.view.contentDOM.getBoundingClientRect();
        const size = matchMedia("(pointer:coarse)").matches ? 44 : 28;
        const gutter = rightGutter(this.view.scrollDOM) + this.view.scrollDOM.getBoundingClientRect().left - this.view.scrollDOM.scrollLeft;
        if (event.clientX < gutter - 4 || event.clientX > gutter + size + 4) {
          this.hideHover();
          return;
        }
        const pos = this.view.posAtCoords({
          x: Math.min(
            content2.right - 4,
            Math.max(content2.left + 4, event.clientX)
          ),
          y: event.clientY
        });
        if (pos === null) {
          this.hideHover();
          return;
        }
        if (this.parsedDoc !== this.view.state.doc) {
          this.parsedDoc = this.view.state.doc;
          this.parsedBlocks = blocks(this.view.state.doc.toString());
        }
        const lineBounds = (pos2) => {
          const dom = this.view.domAtPos(pos2).node;
          const el = dom instanceof Element ? dom : dom.parentElement;
          return el?.closest(".cm-line")?.getBoundingClientRect();
        };
        let lo = 0, hi = this.parsedBlocks.length;
        while (lo < hi) {
          const mid = lo + hi >>> 1;
          if (this.parsedBlocks[mid].from <= pos) lo = mid + 1;
          else hi = mid;
        }
        const block = [this.parsedBlocks[lo - 1], this.parsedBlocks[lo]].find(
          (b) => {
            if (!b) return false;
            const a = lineBounds(b.from) ?? this.view.coordsAtPos(b.from), z = lineBounds(b.to) ?? this.view.coordsAtPos(b.to);
            return a && z && event.clientY >= a.top && event.clientY <= Math.max(a.bottom, z.bottom);
          }
        );
        if (!block || state.pins.some((p) => block.from < p.to && block.to > p.from)) {
          this.hideHover();
          return;
        }
        const first = lineBounds(block.from) ?? this.view.coordsAtPos(block.from), last = lineBounds(block.to) ?? this.view.coordsAtPos(block.to);
        if (!first || !last || event.clientY < first.top || event.clientY > Math.max(first.bottom, last.bottom)) {
          this.hideHover();
          return;
        }
        const controls = this.controls.getBoundingClientRect();
        this.hoverPos = block.from;
        this.handle.style.left = gutter - controls.left + "px";
        this.handle.style.top = (first.top + Math.max(first.bottom, last.bottom)) / 2 - controls.top - size / 2 + "px";
        this.handle.hidden = false;
      }
      queueHover(event) {
        this.hoverEvent = event;
        if (!this.hoverFrame)
          this.hoverFrame = requestAnimationFrame(() => {
            this.hoverFrame = 0;
            if (this.hoverEvent && !this.destroyed) this.hover(this.hoverEvent);
          });
      }
      destroy() {
        cancelAnimationFrame(this.hoverFrame);
        this.destroyed = true;
        this.persist();
        this.cards.forEach((c) => c.destroy());
        this.cards.clear();
        this.view.scrollDOM.removeEventListener("mousemove", this.onGutterMove);
        this.view.scrollDOM.removeEventListener(
          "mouseleave",
          this.onGutterLeave
        );
        this.layer.dispatchEvent(new Event("cv-destroy"));
        this.controls.dispatchEvent(new Event("cv-destroy"));
        this.controls.remove();
        this.cancelGrip();
        this.tools.destroy();
        this.selection.destroy();
        this.view.dom.removeEventListener("wheel", this.wheel);
        this.camera.destroy();
        this.view.scrollDOM.classList.remove("cv-spatial-scroller");
        host.views.delete(this.view);
        fields.delete(this.view);
      }
    },
    {
      eventHandlers: {
        keydown() {
          this.hideHover();
        },
        scroll() {
          this.hideHover();
        },
        mousemove(event) {
          this.queueHover(event);
        }
      }
    }
  );
  return [
    import_view.EditorView.editorAttributes.of({ class: "cv-design-editor" }),
    import_state.Prec.high(field),
    plugin
  ];
}
function refreshSpatial(view) {
  if (fields.has(view))
    view.dispatch({ effects: action.of({ type: "refresh" }) });
}
function toggleSpatial(view) {
  if (fields.has(view))
    view.dispatch({ effects: action.of({ type: "toggle" }) });
}
function floatAtCursor(view, host) {
  return floatAt(view, host, view.state.selection.main.head);
}
function floatAt(view, host, pos) {
  const field = fields.get(view);
  if (!field) return;
  const state = view.state.field(field);
  if (!state.live) {
    host.notify(
      "Switch this note to Live Preview to place blocks. Source mode always shows the original Markdown."
    );
    return;
  }
  if (!state.path) {
    host.notify("Save this note before placing blocks.");
    return;
  }
  const block = blockAt(view.state.doc.toString(), pos);
  if (!block) return;
  if (state.pins.some((p) => block.from < p.to && block.to > p.from)) {
    host.notify("This block is already floating.");
    return;
  }
  const rect = view.scrollDOM.getBoundingClientRect();
  const at = view.coordsAtPos(block.from);
  const content2 = view.contentDOM.getBoundingClientRect();
  const width = limit(Math.min(content2.width - 32, 420), 200, 1200);
  const camera = objectCameraX(view.scrollDOM);
  const rightMargin = content2.right - rect.left - view.scrollDOM.clientLeft + view.scrollDOM.scrollLeft - camera + 32;
  const hasMargin = rightMargin + width <= view.scrollDOM.scrollLeft - camera + view.scrollDOM.clientWidth - 16;
  const bottom = view.coordsAtPos(view.state.doc.length)?.bottom ?? at?.bottom ?? rect.top;
  const pin = {
    ...block,
    id: crypto.randomUUID(),
    x: limit(
      hasMargin ? rightMargin : Math.max(
        16 - camera,
        content2.left - rect.left - view.scrollDOM.clientLeft + view.scrollDOM.scrollLeft - camera
      ),
      -5e4,
      5e4
    ),
    y: limit(
      (hasMargin ? at?.top ?? rect.top : bottom + 32) - rect.top + view.scrollDOM.scrollTop,
      8,
      5e4
    ),
    width,
    height: 180
  };
  for (let pass = 0; pass < state.pins.length + 1; pass++) {
    const overlap = state.pins.find(
      (p) => pin.x < p.x + p.width + 16 && pin.x + pin.width + 16 > p.x && pin.y < p.y + p.height + 72 && pin.y + pin.height + 72 > p.y
    );
    if (!overlap) break;
    pin.y = limit(overlap.y + overlap.height + 72, 8, 5e4);
  }
  view.dispatch({ effects: action.of({ type: "add", pin }) });
  return pin;
}
var FloatingBlock = class {
  constructor(view, host, pin, parent, persist, selection, previewConnections) {
    this.view = view;
    this.host = host;
    this.persist = persist;
    this.selection = selection;
    this.previewConnections = previewConnections;
    this.pin = pin;
    this.id = pin.id;
    this.selection.register(this);
    this.path = this.view.state.field(fields.get(this.view)).path;
    this.root = document.createElement("article");
    this.root.className = "cv-floating-block";
    this.root.dataset.id = pin.id;
    this.root.setAttribute("aria-label", "Floating block in this note");
    this.root.contentEditable = "false";
    this.root.tabIndex = 0;
    this.root.onfocus = () => this.selection.select(this);
    this.root.addEventListener("focusin", () => this.selection.select(this));
    parent.append(this.root);
    const toolbar = document.createElement("div");
    this.toolbar = toolbar;
    toolbar.className = "cv-context-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Selected text tools");
    this.root.append(toolbar);
    this.grip = iconButton(
      toolbar,
      "move",
      "Move this block",
      () => this.select()
    );
    this.grip.classList.add("cv-block-grip");
    this.grip.onpointerdown = (e) => this.beginDrag(e);
    this.grip.onkeydown = (e) => this.nudge(e, false);
    this.editButton = iconButton(
      toolbar,
      "pencil",
      "Edit text in place",
      () => {
        this.select();
        if (this.textarea) {
          if (this.commitDraft?.()) this.finishEdit();
        } else this.edit();
      }
    );
    iconButton(
      toolbar,
      "corner-up-left",
      "Return block to normal text flow",
      () => {
        const from = this.pin.from;
        this.dispatch({ type: "remove", id: this.pin.id });
        this.view.dispatch({
          selection: { anchor: Math.min(from, this.view.state.doc.length) },
          scrollIntoView: true
        });
        this.view.focus();
      }
    );
    const del = iconButton(
      toolbar,
      "trash-2",
      "Delete this block from note",
      () => this.remove()
    );
    del.classList.add("cv-danger");
    iconButton(
      toolbar,
      "settings-2",
      "Text block settings",
      () => this.openSettings()
    );
    this.frame = document.createElement("div");
    this.frame.className = "cv-rotated-frame cv-text-frame";
    this.root.append(this.frame);
    this.body = document.createElement("div");
    this.body.className = "cv-floating-body markdown-rendered";
    this.body.dir = "auto";
    this.body.ondblclick = () => this.edit();
    bindContextMenu(this.root, (point) => this.menu(point));
    this.frame.append(this.body);
    addHandles(
      this.frame,
      (e, h) => this.drag(e, h),
      (e) => this.nudge(e, true)
    );
    this.updateGrip = leftGrip(
      this.root,
      () => this.pin,
      (e) => this.beginDrag(e),
      (e) => this.nudge(e, false),
      () => this.menu()
    );
    this.cancelRotate = rotationHandle(
      this.root,
      this.frame,
      () => this.pin,
      (n) => {
        this.dispatch({
          type: "place",
          id: this.pin.id,
          placement: { rotation: n }
        });
        this.selection.position();
      },
      (p) => this.previewConnections(p)
    );
    this.resize = this.root.querySelector(".cv-handle-se");
    this.root.onpointerdown = (e) => {
      if (e.target.closest("button,textarea,input,a")) return;
      this.beginDrag(e);
    };
    this.root.onkeydown = (e) => {
      if (e.target.closest("textarea,input,button")) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        this.remove();
      } else if (e.key === "Escape") this.selection.select(null);
      else this.nudge(e, false);
    };
    this.root.addEventListener("keydown", (e) => e.stopPropagation());
    this.root.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.root.addEventListener("mousedown", (e) => e.stopPropagation());
    this.root.addEventListener("input", (e) => e.stopPropagation());
    this.observer = new ResizeObserver((entries) => {
      if (this.dragging) return;
      const height = Math.ceil(
        entries[0].borderBoxSize?.[0]?.blockSize ?? entries[0].contentRect.height
      );
      if (Math.abs(height - this.pin.height) > 2 && height > 0) {
        cancelAnimationFrame(this.sizeFrame);
        this.sizeFrame = requestAnimationFrame(() => {
          if (this.root.isConnected)
            this.dispatch({
              type: "place",
              id: this.pin.id,
              placement: { height }
            });
        });
      }
    });
    this.observer.observe(this.root);
  }
  id;
  toolbar;
  editButton;
  frame;
  updateGrip;
  alignGrip = () => this.updateGrip();
  cancelRotate;
  commitDraft = null;
  dragging = false;
  root;
  body;
  grip;
  resize;
  textarea = null;
  pin;
  life = null;
  generation = 0;
  lastText = null;
  composing = false;
  draftBase = "";
  path = "";
  conflictWarned = false;
  cleanupDrag = null;
  observer;
  sizeFrame = 0;
  dispatch(a) {
    this.view.dispatch({ effects: action.of(a) });
  }
  update(pin) {
    this.pin = pin;
    this.frame.style.rotate = (pin.rotation ?? 0) + "deg";
    this.root.style.left = pin.x + "px";
    this.root.style.top = pin.y + "px";
    this.root.style.width = pin.width + "px";
    this.root.style.minHeight = pin.height + "px";
    this.body.style.fontSize = pin.fontSize ? pin.fontSize + "px" : "";
    this.body.style.color = pin.color ?? "";
    this.body.style.background = pin.background ?? "";
    if (this.textarea)
      this.textarea.style.fontSize = pin.fontSize ? pin.fontSize + "px" : "";
    this.updateGrip();
    this.selection.refreshLayers();
    const source = pin.text;
    if (this.textarea) {
      if (source !== this.draftBase) {
        if (this.textarea.value === this.draftBase || this.textarea.value === source) {
          const at = this.textarea.selectionStart;
          this.textarea.value = source;
          this.draftBase = source;
          this.textarea.setSelectionRange(
            Math.min(at, source.length),
            Math.min(at, source.length)
          );
        } else if (!this.conflictWarned) {
          this.conflictWarned = true;
          this.showConflict();
          this.host.notify(
            "This block changed elsewhere. Your draft is still in the text box; copy it before returning to the source. It was not overwritten."
          );
        }
      }
      if (source !== this.draftBase) this.sizeInput();
      return;
    }
    if (this.lastText !== source) {
      this.lastText = source;
      void this.render(source);
    }
  }
  async render(text) {
    const generation = ++this.generation;
    this.life?.unload();
    this.life = new import_obsidian4.Component();
    this.life.load();
    const staging = document.createElement("div");
    this.body.replaceChildren(staging);
    try {
      await import_obsidian4.MarkdownRenderer.render(
        this.host.app,
        text,
        staging,
        this.view.state.field(fields.get(this.view)).path,
        this.life
      );
      if (generation !== this.generation || this.textarea) return;
    } catch (e) {
      if (generation === this.generation) this.body.textContent = text;
      console.error("Canvsidian block renderer", e);
    }
  }
  setLayer = (layer) => this.dispatch({ type: "place", id: this.pin.id, placement: { layer } });
  menu = (point) => {
    this.select();
    actionMenu(
      this.root.querySelector(".cv-object-grip"),
      [
        { label: "Edit text", icon: "pencil", run: () => this.edit() },
        {
          label: "Text size and color",
          icon: "palette",
          run: () => this.openSettings()
        },
        {
          label: "Copy Markdown",
          icon: "clipboard-copy",
          run: () => copyText(this.pin.text, (m) => this.host.notify(m))
        },
        ...alignmentActions(
          this.view.scrollDOM,
          this.position,
          (p) => this.dispatch({ type: "place", id: this.pin.id, placement: p })
        ),
        {
          label: "Reset rotation",
          icon: "rotate-ccw",
          run: () => this.dispatch({
            type: "place",
            id: this.pin.id,
            placement: { rotation: 0 }
          })
        },
        ...layerActions(this.selection, this),
        {
          label: "Duplicate",
          icon: "copy",
          run: () => this.view.dispatch({
            changes: { from: this.pin.to, insert: "\n\n" + this.pin.text }
          })
        },
        {
          label: "Return to text flow",
          icon: "corner-up-left",
          run: () => this.dispatch({ type: "remove", id: this.pin.id })
        },
        {
          label: "Return and edit source",
          icon: "file-text",
          run: () => {
            const from = this.pin.from;
            this.dispatch({ type: "remove", id: this.pin.id });
            this.view.dispatch({
              selection: { anchor: from },
              scrollIntoView: true
            });
            this.view.focus();
          }
        },
        { label: "Delete", icon: "trash-2", run: () => this.remove() }
      ],
      point
    );
  };
  position = () => this.pin;
  bounds = () => rotatedBounds(this.pin);
  openSettings = () => {
    this.selection.select(this);
    this.toolbar.querySelector(".cv-property-popover")?.remove();
    const menu = document.createElement("div");
    menu.className = "cv-property-popover cv-text-properties";
    this.toolbar.append(menu);
    const label = document.createElement("label");
    label.textContent = "Width";
    const input = document.createElement("input");
    input.type = "number";
    input.min = "120";
    input.max = "4000";
    input.value = String(Math.round(this.pin.width));
    input.setAttribute("aria-label", "Text block width");
    input.onchange = () => this.dispatch({
      type: "place",
      id: this.pin.id,
      placement: { width: limit(Number(input.value) || 200, 120, 4e3) }
    });
    label.append(input);
    menu.append(label);
    const number2 = (name2, value, min, max, key) => {
      const label2 = document.createElement("label");
      label2.textContent = name2;
      const input2 = document.createElement("input");
      input2.type = "number";
      input2.min = String(min);
      input2.max = String(max);
      input2.value = String(value);
      input2.setAttribute("aria-label", name2);
      input2.onchange = () => this.dispatch({
        type: "place",
        id: this.pin.id,
        placement: { [key]: limit(Number(input2.value) || min, min, max) }
      });
      label2.append(input2);
      menu.append(label2);
    };
    number2("Text font size", this.pin.fontSize ?? 16, 12, 144, "fontSize");
    number2("Text block height", this.pin.height, 28, 1e4, "height");
    for (const key of ["color", "background"]) {
      const label2 = document.createElement("label");
      label2.textContent = key === "color" ? "Text color" : "Background color";
      const input2 = document.createElement("input");
      input2.type = "color";
      input2.value = this.pin[key]?.startsWith("#") ? this.pin[key] : key === "color" ? "#2783DE" : "#FFF0AD";
      input2.setAttribute("aria-label", label2.textContent);
      input2.onchange = () => this.dispatch({
        type: "place",
        id: this.pin.id,
        placement: { [key]: input2.value }
      });
      label2.append(input2);
      menu.append(label2);
    }
    iconButton(
      menu,
      "rotate-ccw",
      "Reset text appearance",
      () => this.dispatch({
        type: "place",
        id: this.pin.id,
        placement: {
          fontSize: void 0,
          color: void 0,
          background: void 0
        }
      })
    );
    rotationField(menu, this.pin.rotation ?? 0, (n) => {
      this.dispatch({
        type: "place",
        id: this.pin.id,
        placement: { rotation: n }
      });
      this.selection.position();
    });
    this.selection.position();
  };
  select() {
    this.selection.select(this);
    this.root.focus({ preventScroll: true });
  }
  remove = () => {
    confirmAction(
      this.host.app,
      "Delete this block?",
      "This removes the block\u2019s Markdown from this note. Text undo can restore it. Returning a block to normal flow is a separate action.",
      "Delete block",
      () => {
        if (!this.root.isConnected) return;
        this.view.dispatch({
          changes: { from: this.pin.from, to: this.pin.to, insert: "" },
          effects: action.of({ type: "remove", id: this.pin.id }),
          annotations: import_state.Transaction.userEvent.of("delete.selection")
        });
        this.view.focus();
      }
    );
  };
  edit() {
    this.selection.select(this);
    if (this.textarea) {
      this.textarea.focus();
      return;
    }
    this.generation++;
    this.life?.unload();
    this.life = null;
    this.body.replaceChildren();
    const input = document.createElement("textarea");
    this.textarea = input;
    input.className = "cv-inline-input";
    input.dir = "auto";
    input.setAttribute("aria-label", "Edit floating block Markdown");
    input.value = this.view.state.doc.sliceString(this.pin.from, this.pin.to);
    this.draftBase = input.value;
    this.conflictWarned = false;
    this.body.append(input);
    const commit = () => {
      if (this.composing) return false;
      const before = this.view.state.doc.sliceString(
        this.pin.from,
        this.pin.to
      );
      if (before === input.value) {
        this.draftBase = before;
        return true;
      }
      if (before !== this.draftBase) {
        this.showConflict();
        this.host.notify(
          "The source changed while you were editing. Your draft has been kept; copy it before continuing."
        );
        return false;
      }
      this.view.dispatch({
        changes: { from: this.pin.from, to: this.pin.to, insert: input.value },
        annotations: import_state.Transaction.userEvent.of("input.type")
      });
      this.draftBase = input.value;
      return true;
    };
    input.addEventListener("compositionstart", () => this.composing = true);
    input.addEventListener("compositionend", () => {
      this.composing = false;
      commit();
    });
    input.oninput = () => {
      commit();
      this.sizeInput();
    };
    input.onkeydown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (this.composing) return;
        e.preventDefault();
        (e.shiftKey ? import_commands.redo : import_commands.undo)(this.view);
      }
      if (e.key === "Escape" && !this.composing) {
        e.preventDefault();
        if (commit()) this.finishEdit();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !this.composing) {
        e.preventDefault();
        if (commit()) this.finishEdit();
      }
    };
    this.commitDraft = commit;
    (0, import_obsidian4.setIcon)(this.editButton, "check");
    this.editButton.setAttribute("aria-label", "Finish editing this block");
    this.editButton.title = "Finish editing this block";
    this.sizeInput();
    input.focus();
  }
  showConflict() {
    if (!this.body.querySelector(".cv-draft-warning")) {
      const warning = document.createElement("p");
      warning.className = "cv-draft-warning";
      warning.textContent = "Source changed elsewhere. Your draft has not been applied. Copy it before returning this block.";
      warning.setAttribute("role", "alert");
      this.body.append(warning);
    }
  }
  sizeInput() {
    if (this.textarea) {
      this.textarea.style.height = "auto";
      this.textarea.style.height = Math.max(88, this.textarea.scrollHeight) + "px";
    }
  }
  finishEdit() {
    this.composing = false;
    this.commitDraft = null;
    (0, import_obsidian4.setIcon)(this.editButton, "pencil");
    this.editButton.setAttribute("aria-label", "Edit text in place");
    this.editButton.title = "Edit text in place";
    this.textarea = null;
    this.body.replaceChildren();
    this.lastText = null;
    this.update(this.pin);
    this.grip.focus({ preventScroll: true });
  }
  beginDrag(event, alignToPointer = false) {
    if (event.button !== 0) return;
    this.select();
    if (alignToPointer) {
      const rect = this.view.scrollDOM.getBoundingClientRect();
      this.dispatch({
        type: "place",
        id: this.pin.id,
        placement: {
          x: limit(
            event.clientX - rect.left - this.view.scrollDOM.clientLeft + this.view.scrollDOM.scrollLeft - objectCameraX(this.view.scrollDOM) + 24,
            -5e4,
            5e4
          ),
          y: limit(
            event.clientY - rect.top + this.view.scrollDOM.scrollTop - 12,
            0,
            5e4
          )
        }
      });
    }
    this.drag(event);
  }
  nudge(e, resize) {
    const d = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    };
    if (!d[e.key]) return;
    e.preventDefault();
    const [dx, dy] = d[e.key].map((n) => n * (e.shiftKey ? 10 : 1));
    this.dispatch({
      type: "place",
      id: this.pin.id,
      placement: resize ? { width: limit(this.pin.width + dx, 120, 4e3) } : {
        x: limit(this.pin.x + dx, -5e4, 5e4),
        y: limit(this.pin.y + dy, 0, 5e4)
      }
    });
    revealObject(this.view.scrollDOM, this.bounds());
  }
  drag(e, handle) {
    if (e.button !== 0) return;
    this.select();
    this.cleanupDrag?.();
    this.dragging = true;
    const start = { ...this.pin };
    this.cleanupDrag = previewGesture(e, {
      scroller: this.view.scrollDOM,
      root: this.root,
      start,
      explicitHeight: true,
      autoPan: !handle,
      preview: (p) => this.previewConnections(p),
      finishPreview: () => this.previewConnections(null),
      project: (dx, dy) => {
        if (!handle)
          return {
            ...start,
            x: limit(start.x + dx, -5e4, 5e4),
            y: limit(start.y + dy, 0, 5e4)
          };
        return rotatedResize(start, dx, dy, handle, 120, 28);
      },
      commit: (p) => {
        this.dispatch({
          type: "place",
          id: this.pin.id,
          placement: {
            x: p.x,
            y: p.y,
            width: p.width,
            rotation: p.rotation,
            height: p.height
          }
        });
        this.selection.position();
      },
      end: () => {
        this.dragging = false;
        this.cleanupDrag = null;
      }
    });
  }
  destroy() {
    this.root.dispatchEvent(new Event("cv-destroy"));
    this.cancelRotate();
    if (this.textarea && this.textarea.value !== this.draftBase) {
      const path = this.path;
      const drafts = this.host.store.recoveryDrafts ??= [];
      const text = this.textarea.value;
      if (!drafts.some((d) => d.path === path && d.text === text)) {
        drafts.push({
          id: crypto.randomUUID(),
          path,
          text,
          savedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        this.host.scheduleSave();
        this.host.notify(
          "An interrupted block draft was saved. Use Canvsidian: Recover interrupted block drafts to copy it."
        );
      }
    }
    this.generation++;
    cancelAnimationFrame(this.sizeFrame);
    this.cleanupDrag?.();
    this.observer.disconnect();
    this.life?.unload();
    this.selection.remove(this);
    this.root.remove();
  }
};

// src/plugin-settings.ts
var import_obsidian5 = require("obsidian");
function preferenceControls(container, host) {
  const prefs = () => normalizePreferences(host.store.settings);
  const set = (patch) => {
    host.store.settings = { ...prefs(), ...patch };
    host.scheduleSave();
    host.refreshDesign();
  };
  new import_obsidian5.Setting(container).setName("Dotted note background").setDesc(
    "Show the grid only while spatial effects are enabled. Your Markdown is unchanged."
  ).addToggle(
    (c) => c.setValue(prefs().dotGrid).onChange((v) => set({ dotGrid: v }))
  );
  new import_obsidian5.Setting(container).setName("Dot spacing").addSlider(
    (c) => c.setLimits(12, 64, 4).setValue(prefs().gridSpacing).setDynamicTooltip().onChange((v) => set({ gridSpacing: v }))
  );
  new import_obsidian5.Setting(container).setName("Dot opacity").addSlider(
    (c) => c.setLimits(5, 40, 5).setValue(prefs().gridOpacity * 100).setDynamicTooltip().onChange((v) => set({ gridOpacity: v / 100 }))
  );
  const p = document.createElement("p");
  p.className = "cv-settings-note";
  p.textContent = "Effects visibility is per note and non-destructive. Reset is separate and asks for confirmation. Images are copied into the vault; deleting their annotation does not delete the image file.";
  container.append(p);
}
var CanvsidianSettings = class extends import_obsidian5.PluginSettingTab {
  constructor(app, plugin, host) {
    super(app, plugin);
    this.host = host;
  }
  display() {
    this.containerEl.replaceChildren();
    preferenceControls(this.containerEl, this.host);
  }
};
function openPreferences(app, host) {
  class Preferences extends import_obsidian5.Modal {
    onOpen() {
      this.titleEl.textContent = "Canvsidian settings";
      preferenceControls(this.contentEl, host);
    }
    onClose() {
      this.contentEl.replaceChildren();
    }
  }
  new Preferences(app).open();
}

// src/assets.ts
var import_obsidian6 = require("obsidian");

// src/raster.ts
function rasterExtension(bytes) {
  if (bytes.length > 20 * 1024 * 1024)
    throw Error("Images must be at most 20 MB.");
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71)
    return "png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  const text = new TextDecoder("ascii").decode(bytes.slice(0, 16));
  if (text.startsWith("GIF87a") || text.startsWith("GIF89a")) return "gif";
  if (text.startsWith("RIFF") && text.slice(8, 12) === "WEBP") return "webp";
  throw Error(
    "Choose a PNG, JPEG, GIF or WebP image. SVG and other files are not imported."
  );
}

// src/assets.ts
async function importRaster(app, file, sourcePath) {
  if (file.size > 20 * 1024 * 1024)
    throw Error("Images must be at most 20 MB.");
  const bytes = await file.arrayBuffer();
  const extension = rasterExtension(new Uint8Array(bytes));
  const bitmap = await createImageBitmap(new Blob([bytes]));
  const ratio = bitmap.width / bitmap.height;
  bitmap.close();
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}_ -]/gu, "").slice(0, 64) || "image";
  const assetPath = await app.fileManager.getAvailablePathForAttachment(
    base + "." + extension,
    sourcePath
  );
  await app.vault.createBinary(assetPath, bytes);
  return {
    assetPath,
    width: 320,
    height: Math.max(24, Math.min(1200, 320 / ratio))
  };
}
function imageURL(app, path) {
  const file = app.vault.getAbstractFileByPath(path);
  return file instanceof import_obsidian6.TFile ? app.vault.getResourcePath(file) : "";
}

// src/main.ts
var Canvsidian = class extends import_obsidian7.Plugin {
  store = { version: 5, notes: {} };
  views = /* @__PURE__ */ new Set();
  dataReady = false;
  timer;
  writes = Promise.resolve();
  async onload() {
    try {
      this.store = normalize(await this.loadData());
    } catch (e) {
      new import_obsidian7.Notice(String(e));
      return;
    }
    this.dataReady = true;
    this.addSettingTab(new CanvsidianSettings(this.app, this, this));
    this.registerEditorExtension(createSpatialExtension(this));
    this.addCommand({
      id: "recover-interrupted-drafts",
      name: "Recover interrupted block drafts",
      callback: () => {
        const modal = new import_obsidian7.Modal(this.app);
        modal.titleEl.setText("Interrupted block drafts");
        const drafts = this.store.recoveryDrafts ?? [];
        if (!drafts.length)
          modal.contentEl.createEl("p", {
            text: "No interrupted drafts have been saved."
          });
        for (const draft of drafts) {
          modal.contentEl.createEl("p", {
            text: draft.path + " \xB7 " + draft.savedAt
          });
          const input = modal.contentEl.createEl("textarea");
          input.value = draft.text;
          input.dir = "auto";
          input.readOnly = true;
          input.style.width = "100%";
          input.style.minHeight = "120px";
          input.setAttribute("aria-label", "Recovered draft for " + draft.path);
        }
        modal.open();
      }
    });
    this.addCommand({
      id: "float-current-block",
      name: "Float this block in the current note",
      editorCheckCallback: (checking, editor, info) => {
        const view = this.findView(editor, info);
        if (!view) return false;
        if (!checking) floatAtCursor(view, this);
        return true;
      }
    });
    this.addCommand({
      id: "toggle-spatial-layout",
      name: "Show / hide spatial layout in this note",
      editorCheckCallback: (checking, editor, info) => {
        const view = this.findView(editor, info);
        if (!view) return false;
        if (!checking) toggleSpatial(view);
        return true;
      }
    });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, info) => {
        const view = this.findView(editor, info);
        if (view)
          menu.addItem(
            (item) => item.setTitle("Float this block here").setIcon("move").onClick(() => floatAtCursor(view, this))
          );
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (this.store.notes[oldPath]) {
          this.store.notes[file.path] = this.store.notes[oldPath];
          delete this.store.notes[oldPath];
          this.scheduleSave();
        }
      })
    );
  }
  refreshDesign() {
    for (const view of this.views) refreshSpatial(view);
  }
  openPreferences() {
    openPreferences(this.app, this);
  }
  importImage(file, path) {
    return importRaster(this.app, file, path);
  }
  imageURL(path) {
    return imageURL(this.app, path);
  }
  findView(editor, _info) {
    return [...this.views].find(
      (v) => v.state.field(import_obsidian7.editorInfoField, false)?.editor === editor
    );
  }
  scheduleSave() {
    if (!this.dataReady) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = void 0;
      void this.flush();
    }, 350);
  }
  async flush() {
    if (!this.dataReady) return;
    const snapshot = JSON.parse(JSON.stringify(this.store));
    this.writes = this.writes.catch(() => {
    }).then(() => this.saveData(snapshot));
    try {
      await this.writes;
    } catch (e) {
      console.error(e);
      new import_obsidian7.Notice("Canvsidian could not save placement. Check vault storage.");
    }
  }
  onunload() {
    if (this.timer) clearTimeout(this.timer);
    void this.flush();
  }
  notify(message) {
    new import_obsidian7.Notice(message);
  }
};
