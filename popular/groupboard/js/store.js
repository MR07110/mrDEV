import { Utils } from './utils.js';

export const Store = {
    uid: Utils.generateId(),
    name: '',
    isTeacher: false,
    roomId: '',
    teacherSecret: '',
    perms: { draw: false, speak: false },
    micActive: false,
    tool: 'draw',
    color: '#007aff',
    size: 4,
    cam: { x: 0, y: 0, z: 1 },
    elements: [],
    livePaths: {},
    laserPaths: {},
    cursors: {},
    users: {},
    unread: 0,
    textPos: null,
    laserEnabled: true,
    minimapVisible: true
};
