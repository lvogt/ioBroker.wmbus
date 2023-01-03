'use strict';

const DATA_LINK_LAYER_SIZE = 10;

const FRAME_A_BLOCK_SIZE = 16;
const FRAME_B_BLOCK_SIZE = 128;

const { calcCrc } = require('./WmbusTools');

function checkCrc(data, start, end) {
    const expected = calcCrc(data, start, end);
    const actual = data.readUInt16BE(end);
    return expected == actual;
}

function checkFrameTypeACrc(data) {
    if (!checkCrc(data, 0, DATA_LINK_LAYER_SIZE)) {
        return false;
    }

    let pos = DATA_LINK_LAYER_SIZE + 2;
    const endPos = Math.min(data.length, getSizeOfTypeAWithCrc(data)) - 2;

    while (pos < data.length) {
        const end = Math.min(pos + FRAME_A_BLOCK_SIZE, endPos);
        if (!checkCrc(data, pos, end)) {
            return false;
        }
        pos += FRAME_A_BLOCK_SIZE + 2;
    }

    return true;
}

function checkFrameTypeBCrc(data) {
    const lengthField = data[0];

    if (lengthField >= FRAME_B_BLOCK_SIZE) { // message has 3 blocks
        if (!checkCrc(data, FRAME_B_BLOCK_SIZE, data.length - 2)) {
            return false;
        }
    }

    const end = Math.min(FRAME_B_BLOCK_SIZE, data.length) - 2;
    return checkCrc(data, 0, end);
}

function stripFrameTypeACrc(data) {
    const blocks = [];
    blocks.push(data.subarray(0, DATA_LINK_LAYER_SIZE));

    let pos = DATA_LINK_LAYER_SIZE + 2;
    const endPos = Math.min(data.length, getSizeOfTypeAWithCrc(data)) - 2;

    while (pos < data.length) {
        const end = Math.min(pos + FRAME_A_BLOCK_SIZE, endPos);
        blocks.push(data.subarray(pos, end));
        pos += FRAME_A_BLOCK_SIZE + 2;
    }

    return Buffer.concat(blocks);
}

function stripFrameTypeBCrc(data) {
    const block12 = data.subarray(0, Math.min(FRAME_B_BLOCK_SIZE, data.length) - 2);

    if (data[0] >= FRAME_B_BLOCK_SIZE) {
        return Buffer.concat([block12, data.subarray(FRAME_B_BLOCK_SIZE, data.length - 2)]);
    } else {
        return block12;
    }
}

function getSizeOfTypeAWithCrc(data) {
    const length = data[0] + 1;
    const appLength = length - DATA_LINK_LAYER_SIZE;
    const blockCount = Math.ceil(appLength / FRAME_A_BLOCK_SIZE);
    return length + (blockCount + 1) * 2;
}

function stripAndCheckCrcIfExists(data) {
    const size = data[0] + 1;

    if (size > data.length) {
        throw new Error(`Telegram data is too short! Expected at least ${size} bytes, but got only ${data.length}`);
    }

    if (size == data.length) { // type A without CRC | or type B with or w/o CRC
        if (checkFrameTypeBCrc(data)) { // type with CRC
            return stripFrameTypeBCrc(data);
        } else { // assume without CRC - so A or B do not matter
            return data;
        }
    } else { // type A with CRC (or trailing data...)
        if (getSizeOfTypeAWithCrc(data) > data.length) {
            throw new Error(`Telegram data is too short! Expected at least ${getSizeOfTypeAWithCrc(data)} bytes, but got only ${data.length}`);
        }

        if (checkFrameTypeACrc(data)) {
            return stripFrameTypeACrc(data);
        } else {
            throw new Error('Frame type A CRC check failed!');
        }
    }
}

function stripAndCheckCrc(data) {
    const size = data[0] + 1;

    if (size > data.length) {
        throw new Error(`Telegram data is too short! Expected at least ${size} bytes, but got only ${data.length}`);
    }

    if (size == data.length) { // type B
        if (checkFrameTypeBCrc(data)) { // type with CRC
            return stripFrameTypeBCrc(data);
        } else { // assume without CRC - so A or B do not matter
            throw new Error('Frame type B CRC check failed!');
        }
    } else { // type A with CRC (or trailing data...)
        const expectedSizeTypeA = getSizeOfTypeAWithCrc(data);
        let sizedData = data;
        if (expectedSizeTypeA > data.length) {
            throw new Error(`Telegram data is too short! Expected at least ${getSizeOfTypeAWithCrc(data)} bytes, but got only ${data.length}`);
        } else if (expectedSizeTypeA < data.length) {
            sizedData = data.subarray(0, expectedSizeTypeA);
        }

        if (checkFrameTypeACrc(sizedData)) {
            return stripFrameTypeACrc(sizedData);
        } else {
            throw new Error('Frame type A CRC check failed!');
        }
    }
}

function trimData(data) {
    const size = data[0] + 1;
    return data.subarray(0, size);
}

function handleWiredMbusFrame(data) {
    const size = data[1];
    if (data[2] != size) {
        throw new Error('Telegram is not a valid wired M-Bus frame!');
    }

    // check checksum
    let csum = 0;
    for (let i = 4; i < data.length - 2; i++) {
        csum = (csum + data[i]) & 0xFF;
    }

    if (csum != data[data.length - 2]) {
        throw new Error('Wired M-Bus frame CRC check failed!');
    }

    return data.subarray(0, data.length - 2);
}

function handleCrc(data, containsCrc) {
    if (data[0] == 0x68 && data[3] == 0x68 && data[data.length - 1] == 0x16) {
        return handleWiredMbusFrame(data);
    }

    if (typeof containsCrc === 'undefined') {
        return stripAndCheckCrcIfExists(data);
    }

    if (containsCrc) {
        return trimData(stripAndCheckCrc(data));
    }

    return trimData(data);
}

module.exports = handleCrc;