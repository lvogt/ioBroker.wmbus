'use strict';

const TYPE_NUMBER = 'number';
const TYPE_STRING = 'string';
const TYPE_DATE = 'date';
const TYPE_DATE_TIME = 'datetime';

function calcTypeGdate(value) {
    //value is a 16bit int

    //day:   UI5 [1 to 5] <1 to 31>
    //month: UI4 [9 to 12] <1 to 12>
    //year:  UI7 [6 to 8,13 to 16] <0 to 99>

    //   YYYY MMMM YYY DDDDD
    // 0b0000 1100 111 11111 = 31.12.2007
    // 0b0000 0100 111 11110 = 30.04.2007

    const day = (value & 0b11111);
    const month = ((value & 0b111100000000) >> 8);
    const year = (((value & 0b1111000000000000) >> 9) | ((value & 0b11100000) >> 5)) + 2000;
    return new Date(year, month - 1, day);
}

function calcDateTime(value) {
    if (value > 0xFFFFFFFF) {
        return calcTypeIdateTime(value);
    } else {
        return calcTypeFdateTime(value);
    }
}

function calcTypeFdateTime(value) {
    // min: UI6 [1 to 6] <0 to 59>
    // hour: UI5 [9 to 13] <0 to 23>

    // date: UI32 [17 to 32] see type G

    // IV: B1[8] 0 == valid ; 1 == invalid time
    // SU: B1[16] 0 == standard time ; 1 == summer time
    // reserved B1[7,14,15] {reserved};

    const datePart = value >> 16;
    const timeInvalid = value & 0b10000000;

    let date = calcTypeGdate(datePart);
    if (timeInvalid == 0) {
        const minutes = (value & 0b111111);
        const hours = (value >> 8) & 0b11111;
        // summerTime bit is currently ignored!
        //const summerTime = (value & 0b1000000000000000);

        date.setHours(hours);
        date.setMinutes(minutes);
    }
    return date;
}

function calcTypeIdateTime(value) {
    const buf = Buffer.alloc(6);
    buf.writeUIntLE(value, 0, 6);

    const seconds = buf[0] & 0x3f;
    const minutes = buf[1] & 0x3f;
    const hours = buf[2] & 0x1f;
    const day = buf[3] & 0x1f;
    const month = buf[4] & 0x0f;
    const year = ((buf[3] & 0xe0) >> 5) | ((buf[4] & 0xf0) >> 1);
    return new Date(2000 + year, month - 1, day, hours, minutes, seconds);
}

function getVif(vif) {
    if (vif.table === 'primary') {
        return getPrimaryVif(vif.vif);
    } else if (vif.table === 'fb') {
        return getPrimaryVifFb(vif.vif);
    } else if (vif.table === 'fd') {
        return getPrimaryVifFd((vif.vif));
    } else if (vif.table === 'plain') {
        return createPlaintextVif(vif);
    } else if (vif.table === 'manufacturer') {
        return handleManufacturerSpecifcVif(vif);
    } else {
        throw new Error(`How did we end up here? Unknown VIF table! ${JSON.stringify(vif)}`);
    }
}

function createPlaintextVif(vif) {
    return {
        vif: 'PLAINTEXT',
        unit: vif.plain,
        description: 'Plaintext VIF',
        type: TYPE_NUMBER,
        calc: val => val
    };
}

function handleManufacturerSpecifcVif(vif) {
    throw new Error('Unimplemented');
}

function getPrimaryVif(vifValue) {
    switch (vifValue) {
        case 0x00: return {
            vif: 'ENERGY_WATT',
            unit: 'Wh',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x01: return {
            vif: 'ENERGY_WATT',
            unit: 'Wh',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x02: return {
            vif: 'ENERGY_WATT',
            unit: 'Wh',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x03: return {
            vif: 'ENERGY_WATT',
            unit: 'Wh',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x04: return {
            vif: 'ENERGY_WATT',
            unit: 'Wh',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val * 10
        };
        case 0x05: return {
            vif: 'ENERGY_WATT',
            unit: 'Wh',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val * 100
        };
        case 0x06: return {
            vif: 'ENERGY_WATT',
            unit: 'Wh',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val * 1000
        };
        case 0x07: return {
            vif: 'ENERGY_WATT',
            unit: 'Wh',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val * 10000
        };
        case 0x08: return {
            vif: 'ENERGY_JOULE',
            unit: 'J',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x09: return {
            vif: 'ENERGY_JOULE',
            unit: 'J',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val * 10
        };
        case 0x0a: return {
            vif: 'ENERGY_JOULE',
            unit: 'J',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val * 100
        };
        case 0x0b: return {
            vif: 'ENERGY_JOULE',
            unit: 'J',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val * 1000
        };
        case 0x0c: return {
            vif: 'ENERGY_JOULE',
            unit: 'J',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val * 10000
        };
        case 0x0d: return {
            vif: 'ENERGY_JOULE',
            unit: 'J',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val * 100000
        };
        case 0x0e: return {
            vif: 'ENERGY_JOULE',
            unit: 'J',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val * 1000000
        };
        case 0x0f: return {
            vif: 'ENERGY_JOULE',
            unit: 'J',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val * 10000000
        };
        case 0x10: return {
            vif: 'VOLUME',
            unit: 'm³',
            description: 'Volume',
            type: TYPE_NUMBER,
            calc: val => val / 1000000
        };
        case 0x11: return {
            vif: 'VOLUME',
            unit: 'm³',
            description: 'Volume',
            type: TYPE_NUMBER,
            calc: val => val / 100000
        };
        case 0x12: return {
            vif: 'VOLUME',
            unit: 'm³',
            description: 'Volume',
            type: TYPE_NUMBER,
            calc: val => val / 10000
        };
        case 0x13: return {
            vif: 'VOLUME',
            unit: 'm³',
            description: 'Volume',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x14: return {
            vif: 'VOLUME',
            unit: 'm³',
            description: 'Volume',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x15: return {
            vif: 'VOLUME',
            unit: 'm³',
            description: 'Volume',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x16: return {
            vif: 'VOLUME',
            unit: 'm³',
            description: 'Volume',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x17: return {
            vif: 'VOLUME',
            unit: 'm³',
            description: 'Volume',
            type: TYPE_NUMBER,
            calc: val => val * 10
        };
        case 0x18: return {
            vif: 'MASS',
            unit: 'kg',
            description: 'Mass',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x19: return {
            vif: 'MASS',
            unit: 'kg',
            description: 'Mass',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x1a: return {
            vif: 'MASS',
            unit: 'kg',
            description: 'Mass',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x1b: return {
            vif: 'MASS',
            unit: 'kg',
            description: 'Mass',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x1c: return {
            vif: 'MASS',
            unit: 'kg',
            description: 'Mass',
            type: TYPE_NUMBER,
            calc: val => val * 10
        };
        case 0x1d: return {
            vif: 'MASS',
            unit: 'kg',
            description: 'Mass',
            type: TYPE_NUMBER,
            calc: val => val * 100
        };
        case 0x1e: return {
            vif: 'MASS',
            unit: 'kg',
            description: 'Mass',
            type: TYPE_NUMBER,
            calc: val => val * 1000
        };
        case 0x1f: return {
            vif: 'MASS',
            unit: 'kg',
            description: 'Mass',
            type: TYPE_NUMBER,
            calc: val => val * 10000
        };
        case 0x20: return {
            vif: 'ON_TIME',
            unit: 's',
            description: 'On Time',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x21: return {
            vif: 'ON_TIME',
            unit: 'min',
            description: 'On Time',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x22: return {
            vif: 'ON_TIME',
            unit: 'h',
            description: 'On Time',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x23: return {
            vif: 'ON_TIME',
            unit: 'd',
            description: 'On Time',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x24: return {
            vif: 'OP_TIME',
            unit: 's',
            description: 'Operating Time',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x25: return {
            vif: 'OP_TIME',
            unit: 'min',
            description: 'Operating Time',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x26: return {
            vif: 'OP_TIME',
            unit: 'h',
            description: 'Operating Time',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x27: return {
            vif: 'OP_TIME',
            unit: 'd',
            description: 'Operating Time',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x28: return {
            vif: 'ELECTRIC_POWER',
            unit: 'W',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x29: return {
            vif: 'ELECTRIC_POWER',
            unit: 'W',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x2a: return {
            vif: 'ELECTRIC_POWER',
            unit: 'W',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x2b: return {
            vif: 'ELECTRIC_POWER',
            unit: 'W',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x2c: return {
            vif: 'ELECTRIC_POWER',
            unit: 'W',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val * 10
        };
        case 0x2d: return {
            vif: 'ELECTRIC_POWER',
            unit: 'W',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val * 100
        };
        case 0x2e: return {
            vif: 'ELECTRIC_POWER',
            unit: 'W',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val * 1000
        };
        case 0x2f: return {
            vif: 'ELECTRIC_POWER',
            unit: 'W',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val * 10000
        };
        case 0x30: return {
            vif: 'THERMAL_POWER',
            unit: 'J/h',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x31: return {
            vif: 'THERMAL_POWER',
            unit: 'J/h',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val * 10
        };
        case 0x32: return {
            vif: 'THERMAL_POWER',
            unit: 'J/h',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val * 100
        };
        case 0x33: return {
            vif: 'THERMAL_POWER',
            unit: 'J/h',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val * 1000
        };
        case 0x34: return {
            vif: 'THERMAL_POWER',
            unit: 'J/h',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val * 10000
        };
        case 0x35: return {
            vif: 'THERMAL_POWER',
            unit: 'J/h',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val * 100000
        };
        case 0x36: return {
            vif: 'THERMAL_POWER',
            unit: 'J/h',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val * 1000000
        };
        case 0x37: return {
            vif: 'THERMAL_POWER',
            unit: 'J/h',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val * 10000000
        };
        case 0x38: return {
            vif: 'VOLUME_FLOW',
            unit: 'm³/h',
            description: 'Volume Flow',
            type: TYPE_NUMBER,
            calc: val => val / 1000000
        };
        case 0x39: return {
            vif: 'VOLUME_FLOW',
            unit: 'm³/h',
            description: 'Volume Flow',
            type: TYPE_NUMBER,
            calc: val => val / 100000
        };
        case 0x3a: return {
            vif: 'VOLUME_FLOW',
            unit: 'm³/h',
            description: 'Volume Flow',
            type: TYPE_NUMBER,
            calc: val => val / 10000
        };
        case 0x3b: return {
            vif: 'VOLUME_FLOW',
            unit: 'm³/h',
            description: 'Volume Flow',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x3c: return {
            vif: 'VOLUME_FLOW',
            unit: 'm³/h',
            description: 'Volume Flow',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x3d: return {
            vif: 'VOLUME_FLOW',
            unit: 'm³/h',
            description: 'Volume Flow',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x3e: return {
            vif: 'VOLUME_FLOW',
            unit: 'm³/h',
            description: 'Volume Flow',
            type: TYPE_NUMBER,
            calc: val => val * 1
        };
        case 0x3f: return {
            vif: 'VOLUME_FLOW',
            unit: 'm³/h',
            description: 'Volume Flow',
            type: TYPE_NUMBER,
            calc: val => val * 10
        };
        case 0x40: return {
            vif: 'VOLUME_FLOW_EXT1',
            unit: 'm³/min',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 10000000
        };
        case 0x41: return {
            vif: 'VOLUME_FLOW_EXT1',
            unit: 'm³/min',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 1000000
        };
        case 0x42: return {
            vif: 'VOLUME_FLOW_EXT1',
            unit: 'm³/min',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 100000
        };
        case 0x43: return {
            vif: 'VOLUME_FLOW_EXT1',
            unit: 'm³/min',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 10000
        };
        case 0x44: return {
            vif: 'VOLUME_FLOW_EXT1',
            unit: 'm³/min',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x45: return {
            vif: 'VOLUME_FLOW_EXT1',
            unit: 'm³/min',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x46: return {
            vif: 'VOLUME_FLOW_EXT1',
            unit: 'm³/min',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x47: return {
            vif: 'VOLUME_FLOW_EXT1',
            unit: 'm³/min',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x48: return {
            vif: 'VOLUME_FLOW_EXT2',
            unit: 'm³/s',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 1000000000
        };
        case 0x49: return {
            vif: 'VOLUME_FLOW_EXT2',
            unit: 'm³/s',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 100000000
        };
        case 0x4a: return {
            vif: 'VOLUME_FLOW_EXT2',
            unit: 'm³/s',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 10000000
        };
        case 0x4b: return {
            vif: 'VOLUME_FLOW_EXT2',
            unit: 'm³/s',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 1000000
        };
        case 0x4c: return {
            vif: 'VOLUME_FLOW_EXT2',
            unit: 'm³/s',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 100000
        };
        case 0x4d: return {
            vif: 'VOLUME_FLOW_EXT2',
            unit: 'm³/s',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 10000
        };
        case 0x4e: return {
            vif: 'VOLUME_FLOW_EXT2',
            unit: 'm³/s',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x4f: return {
            vif: 'VOLUME_FLOW_EXT2',
            unit: 'm³/s',
            description: 'Volume Flow ext.',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x50: return {
            vif: 'MASS_FLOW',
            unit: 'kg/h',
            description: 'Mass Flow',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x51: return {
            vif: 'MASS_FLOW',
            unit: 'kg/h',
            description: 'Mass Flow',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x52: return {
            vif: 'MASS_FLOW',
            unit: 'kg/h',
            description: 'Mass Flow',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x53: return {
            vif: 'MASS_FLOW',
            unit: 'kg/h',
            description: 'Mass Flow',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x54: return {
            vif: 'MASS_FLOW',
            unit: 'kg/h',
            description: 'Mass Flow',
            type: TYPE_NUMBER,
            calc: val => val * 10
        };
        case 0x55: return {
            vif: 'MASS_FLOW',
            unit: 'kg/h',
            description: 'Mass Flow',
            type: TYPE_NUMBER,
            calc: val => val * 100
        };
        case 0x56: return {
            vif: 'MASS_FLOW',
            unit: 'kg/h',
            description: 'Mass Flow',
            type: TYPE_NUMBER,
            calc: val => val * 1000
        };
        case 0x57: return {
            vif: 'MASS_FLOW',
            unit: 'kg/h',
            description: 'Mass Flow',
            type: TYPE_NUMBER,
            calc: val => val * 10000
        };
        case 0x58: return {
            vif: 'FLOW_TEMP',
            unit: '°C',
            description: 'Flow Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x59: return {
            vif: 'FLOW_TEMP',
            unit: '°C',
            description: 'Flow Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x5a: return {
            vif: 'FLOW_TEMP',
            unit: '°C',
            description: 'Flow Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x5b: return {
            vif: 'FLOW_TEMP',
            unit: '°C',
            description: 'Flow Temperature',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x5c: return {
            vif: 'RETURN_TEMP',
            unit: '°C',
            description: 'Return Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x5d: return {
            vif: 'RETURN_TEMP',
            unit: '°C',
            description: 'Return Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x5e: return {
            vif: 'RETURN_TEMP',
            unit: '°C',
            description: 'Return Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x5f: return {
            vif: 'RETURN_TEMP',
            unit: '°C',
            description: 'Return Temperature',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x60: return {
            vif: 'TEMP_DIFF',
            unit: 'K',
            description: 'Temperature Difference',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x61: return {
            vif: 'TEMP_DIFF',
            unit: 'K',
            description: 'Temperature Difference',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x62: return {
            vif: 'TEMP_DIFF',
            unit: 'K',
            description: 'Temperature Difference',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x63: return {
            vif: 'TEMP_DIFF',
            unit: 'K',
            description: 'Temperature Difference',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x64: return {
            vif: 'EXTERNAL_TEMP',
            unit: '°C',
            description: 'External Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x65: return {
            vif: 'EXTERNAL_TEMP',
            unit: '°C',
            description: 'External Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x66: return {
            vif: 'EXTERNAL_TEMP',
            unit: '°C',
            description: 'External Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x67: return {
            vif: 'EXTERNAL_TEMP',
            unit: '°C',
            description: 'External Temperature',
            type: TYPE_NUMBER,
            calc: val => val * 1
        };
        case 0x68: return {
            vif: 'PRESSURE',
            unit: 'bar',
            description: 'Pressure',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x69: return {
            vif: 'PRESSURE',
            unit: 'bar',
            description: 'Pressure',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x6a: return {
            vif: 'PRESSURE',
            unit: 'bar',
            description: 'Pressure',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x6b: return {
            vif: 'PRESSURE',
            unit: 'bar',
            description: 'Pressure',
            type: TYPE_NUMBER,
            calc: val => val * 1
        };
        case 0x6c: return {
            vif: 'TIME_POINT_DATE',
            unit: '',
            description: 'Time point',
            type: TYPE_DATE,
            calc: calcTypeGdate
        };
        case 0x6d: return {
            vif: 'TIME_POINT_DATE_TIME',
            unit: '',
            description: 'Time point',
            type: TYPE_DATE_TIME,
            calc: calcDateTime
        };
        case 0x6e: return {
            vif: 'HCA',
            unit: '',
            description: 'Units for H.C.A.',
            type: TYPE_NUMBER,
            calc: val => val
        };
        //Reserved primary VIF 0x6f
        case 0x70: return {
            vif: 'AVERAGING_DURATION',
            unit: 's',
            description: 'Averaging Duration',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x71: return {
            vif: 'AVERAGING_DURATION',
            unit: 'min',
            description: 'Averaging Duration',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x72: return {
            vif: 'AVERAGING_DURATION',
            unit: 'h',
            description: 'Averaging Duration',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x73: return {
            vif: 'AVERAGING_DURATION',
            unit: 'd',
            description: 'Averaging Duration',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x74: return {
            vif: 'ACTUALITY_DURATION',
            unit: 's',
            description: 'Actuality Duration',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x75: return {
            vif: 'ACTUALITY_DURATION',
            unit: 'min',
            description: 'Actuality Duration',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x76: return {
            vif: 'ACTUALITY_DURATION',
            unit: 'h',
            description: 'Actuality Duration',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x77: return {
            vif: 'ACTUALITY_DURATION',
            unit: 'd',
            description: 'Actuality Duration',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x78: return {
            vif: 'FABRICATION_NO',
            unit: '',
            description: 'Fabrication No',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x79: return {
            vif: 'OWNER_NO',
            unit: '',
            description: 'Owner No',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x7a: return {
            vif: 'BUS_ADDRESS',
            unit: '',
            description: 'Bus Address',
            type: TYPE_NUMBER,
            calc: val => val
        };
        /* 0x0x6f 0x7b - 0x7f */
        default: return {
            vif: 'UNKNOWN',
            unit: '',
            description: `Unknown VIF 0x${vifValue.toString(16)}`,
            type: TYPE_NUMBER,
            calc: val => val
        };
    }
}

function getPrimaryVifFb(vifValue) {
    switch (vifValue) {
        case 0x00: return {
            vif: 'ENERGY_MWH',
            unit: 'MWh',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x01: return {
            vif: 'ENERGY_MWH',
            unit: 'MWh',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val
        };
        //Reserved primary VIF 0x02 - 0x07
        case 0x08: return {
            vif: 'ENERGY_GJ',
            unit: 'GJ',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x09: return {
            vif: 'ENERGY_GJ',
            unit: 'GJ',
            description: 'Energy',
            type: TYPE_NUMBER,
            calc: val => val
        };
        //Reserved primary VIF 0x0a - 0x0f
        case 0x10: return {
            vif: 'VOLUME_CM',
            unit: 'm³',
            description: 'Volume',
            type: TYPE_NUMBER,
            calc: val => val * 100
        };
        case 0x11: return {
            vif: 'VOLUME_CM',
            unit: 'm³',
            description: 'Volume',
            type: TYPE_NUMBER,
            calc: val => val * 1000
        };
        //Reserved primary VIF 0x12 - 0x17
        case 0x18: return {
            vif: 'MASS_T',
            unit: 't',
            description: 'Mass',
            type: TYPE_NUMBER,
            calc: val => val * 100
        };
        case 0x19: return {
            vif: 'MASS_T',
            unit: 't',
            description: 'Mass',
            type: TYPE_NUMBER,
            calc: val => val * 1000
        };
        //Reserved primary VIF 0x1a - 0x20
        case 0x21: return {
            vif: 'VOLUME_CFEET',
            unit: 'ft³',
            description: 'Volume',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x22: return {
            vif: 'VOLUME_GALLON',
            unit: 'gal',
            description: 'Volume',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x23: return {
            vif: 'VOLUME_GALLON_L',
            unit: 'gal',
            description: 'Volume',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x24: return {
            vif: 'VOLUME_FLOW_GALLON_L',
            unit: 'gal/min',
            description: 'Volume flow',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x25: return {
            vif: 'VOLUME_FLOW_GALLON',
            unit: 'gal/min',
            description: 'Volume flow',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x26: return {
            vif: 'VOLUME_FLOW_GALLON_H',
            unit: 'gal/h',
            description: 'Volume flow',
            type: TYPE_NUMBER,
            calc: val => val
        };
        //Reserved primary VIF 0x27
        case 0x28: return {
            vif: 'POWER_MW',
            unit: 'MW',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x29: return {
            vif: 'POWER_MW',
            unit: 'MW',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val
        };
        //Reserved primary VIF 0x2a - 0x2f
        case 0x30: return {
            vif: 'POWER_GJH',
            unit: 'GJ/h',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x31: return {
            vif: 'POWER_GJH',
            unit: 'GJ/h',
            description: 'Power',
            type: TYPE_NUMBER,
            calc: val => val
        };
        //Reserved primary VIF 0x32 - 0x57
        case 0x58: return {
            vif: 'TEMPERATURE_FLOW_F',
            unit: '°F',
            description: 'Flow Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x59: return {
            vif: 'TEMPERATURE_FLOW_F',
            unit: '°F',
            description: 'Flow Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x5a: return {
            vif: 'TEMPERATURE_FLOW_F',
            unit: '°F',
            description: 'Flow Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x5b: return {
            vif: 'TEMPERATURE_FLOW_F',
            unit: '°F',
            description: 'Flow Temperature',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x5c: return {
            vif: 'TEMPERATURE_RETURN_F',
            unit: '°F',
            description: 'Return Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x5d: return {
            vif: 'TEMPERATURE_RETURN_F',
            unit: '°F',
            description: 'Return Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x5e: return {
            vif: 'TEMPERATURE_RETURN_F',
            unit: '°F',
            description: 'Return Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x5f: return {
            vif: 'TEMPERATURE_RETURN_F',
            unit: '°F',
            description: 'Return Temperature',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x60: return {
            vif: 'TEMPERATURE_DIFF_F',
            unit: '°F',
            description: 'Temperature Difference',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x61: return {
            vif: 'TEMPERATURE_DIFF_F',
            unit: '°F',
            description: 'Temperature Difference',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x62: return {
            vif: 'TEMPERATURE_DIFF_F',
            unit: '°F',
            description: 'Temperature Difference',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x63: return {
            vif: 'TEMPERATURE_DIFF_F',
            unit: '°F',
            description: 'Temperature Difference',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x64: return {
            vif: 'TEMPERATURE_EXT_F',
            unit: '°F',
            description: 'External Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x65: return {
            vif: 'TEMPERATURE_EXT_F',
            unit: '°F',
            description: 'External Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x66: return {
            vif: 'TEMPERATURE_EXT_F',
            unit: '°F',
            description: 'External Temperature',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x67: return {
            vif: 'TEMPERATURE_EXT_F',
            unit: '°F',
            description: 'External Temperature',
            type: TYPE_NUMBER,
            calc: val => val
        };
        //Reserved primary VIF 0x68 - 0x6f
        case 0x70: return {
            vif: 'COLD_WARM_LIMIT_C',
            unit: '°F',
            description: 'Cold / Warm Temperature Limit',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x71: return {
            vif: 'COLD_WARM_LIMIT_C',
            unit: '°F',
            description: 'Cold / Warm Temperature Limit',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x72: return {
            vif: 'COLD_WARM_LIMIT_C',
            unit: '°F',
            description: 'Cold / Warm Temperature Limit',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x73: return {
            vif: 'COLD_WARM_LIMIT_C',
            unit: '°F',
            description: 'Cold / Warm Temperature Limit',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x74: return {
            vif: 'COLD_WARM_LIMIT_F',
            unit: '°C',
            description: 'Cold / Warm Temperature Limit',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x75: return {
            vif: 'COLD_WARM_LIMIT_F',
            unit: '°C',
            description: 'Cold / Warm Temperature Limit',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x76: return {
            vif: 'COLD_WARM_LIMIT_F',
            unit: '°C',
            description: 'Cold / Warm Temperature Limit',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x77: return {
            vif: 'COLD_WARM_LIMIT_F',
            unit: '°C',
            description: 'Cold / Warm Temperature Limit',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x78: return {
            vif: 'CUMUL_COUNT_MAX_POWER',
            unit: 'W',
            description: 'cumul. count max power',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x79: return {
            vif: 'CUMUL_COUNT_MAX_POWER',
            unit: 'W',
            description: 'cumul. count max power',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x7a: return {
            vif: 'CUMUL_COUNT_MAX_POWER',
            unit: 'W',
            description: 'cumul. count max power',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x7b: return {
            vif: 'CUMUL_COUNT_MAX_POWER',
            unit: 'W',
            description: 'cumul. count max power',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x7c: return {
            vif: 'CUMUL_COUNT_MAX_POWER',
            unit: 'W',
            description: 'cumul. count max power',
            type: TYPE_NUMBER,
            calc: val => val * 10
        };
        case 0x7d: return {
            vif: 'CUMUL_COUNT_MAX_POWER',
            unit: 'W',
            description: 'cumul. count max power',
            type: TYPE_NUMBER,
            calc: val => val * 100
        };
        case 0x7e: return {
            vif: 'CUMUL_COUNT_MAX_POWER',
            unit: 'W',
            description: 'cumul. count max power',
            type: TYPE_NUMBER,
            calc: val => val * 1000
        };
        case 0x7f: return {
            vif: 'CUMUL_COUNT_MAX_POWER',
            unit: 'W',
            description: 'cumul. count max power',
            type: TYPE_NUMBER,
            calc: val => val * 10000
        };
        //0x02 - 0x07; 0x0a - 0x0f; 0x12 - 0x17; 0x1a - 0x20; 0x27; 0x2a - 0x2f; 0x32 - 0x57; 0x68 - 0x6f;
        default: return {
            vif: 'UNKNOWN',
            unit: '',
            description: `Unknown VIF 0x${vifValue.toString(16)}`,
            type: TYPE_NUMBER,
            calc: val => val
        };
    }
}

function getPrimaryVifFd(vifValue) {
    switch (vifValue) {
        case 0x00: return {
            vif: 'CREDIT',
            unit: '€',
            description: 'Credit',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x01: return {
            vif: 'CREDIT',
            unit: '€',
            description: 'Credit',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x02: return {
            vif: 'CREDIT',
            unit: '€',
            description: 'Credit',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x03: return {
            vif: 'CREDIT',
            unit: '€',
            description: 'Credit',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x04: return {
            vif: 'DEBIT',
            unit: '€',
            description: 'Debit',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x05: return {
            vif: 'DEBIT',
            unit: '€',
            description: 'Debit',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x06: return {
            vif: 'DEBIT',
            unit: '€',
            description: 'Debit',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x07: return {
            vif: 'DEBIT',
            unit: '€',
            description: 'Debit',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x08: return {
            vif: 'ACCESS_NO',
            unit: '',
            description: 'Access number (transmission count)',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x09: return {
            vif: 'MEDIUM',
            unit: '',
            description: 'Medium',
            type: TYPE_STRING,
            calc: TODO,
        };
        case 0x0a: return {
            vif: 'MANUFACTURER',
            unit: '',
            description: 'Manufacturer',
            type: TYPE_STRING,
            calc: TODO
        };
        case 0x0b: return {
            vif: 'PARAM_SET_IDENTIFICATION',
            unit: '',
            description: 'Parameter set identification',
            type: TODO,
            calc: TODO
        };
        case 0x0c: return {
            vif: 'MODEL_VERSION',
            unit: '',
            description: 'Model / Version',
            type: TODO,
            calc: TODO
        };
        case 0x0d: return {
            vif: 'HARDWARE_VERSION',
            unit: '',
            description: 'Hardware version #',
            type: TODO,
            calc: TODO
        };
        case 0x0e: return {
            vif: 'FIRMWARE_VERSION',
            unit: '',
            description: 'Firmware version #',
            type: TODO,
            calc: TODO
        };
        case 0x0f: return {
            vif: 'SOFTWARE_VERSION',
            unit: '',
            description: 'Software version #',
            type: TODO,
            calc: TODO
        };
        case 0x10: return {
            vif: 'CUSTOMER_LOCATION',
            unit: '',
            description: 'Customer location',
            type: TODO,
            calc: TODO
        };
        case 0x11: return {
            vif: 'CUSTOMER',
            unit: '',
            description: 'Customer',
            type: TODO,
            calc: TODO
        };
        case 0x12: return {
            vif: 'ACCESS_CODE_USER',
            unit: '',
            description: 'Access Code User',
            type: TODO,
            calc: TODO
        };
        case 0x13: return {
            vif: 'ACCESS_CODE_OPERATOR',
            unit: '',
            description: 'Access Code Operator',
            type: TODO,
            calc: TODO
        };
        case 0x14: return {
            vif: 'ACCESS_CODE_SYS_OPERATOR',
            unit: '',
            description: 'Access Code Sytem Operator',
            type: TODO,
            calc: TODO
        };
        case 0x15: return {
            vif: 'ACCESS_CODE_DEVELOPER',
            unit: '',
            description: 'Access Code Developer',
            type: TODO,
            calc: TODO
        };
        case 0x16: return {
            vif: 'PASSWORD',
            unit: '',
            description: 'Password',
            type: TODO,
            calc: TODO
        };
        case 0x17: return {
            vif: 'ERROR_FLAGS',
            unit: '',
            description: 'Error flags (binary)',
            type: TODO,
            calc: TODO
        };
        case 0x18: return {
            vif: 'ERROR_MASK',
            unit: '',
            description: 'Error mask',
            type: TODO,
            calc: TODO
        };
        //Reserved primary VIF 0x19
        case 0x1a: return {
            vif: 'DIGITAL_OUTPUT_BINARY',
            unit: '',
            description: 'Digital Output (binary)',
            type: TODO,
            calc: TODO
        };
        case 0x1b: return {
            vif: 'DIGITAL_INPUT_BINARY',
            unit: '',
            description: 'Digital Input (binary) ',
            type: TODO,
            calc: TODO
        };
        case 0x1c: return {
            vif: 'BAUDRATE',
            unit: 'baud',
            description: 'Baudrate',
            type: TODO,
            calc: TODO
        };
        case 0x1d: return {
            vif: 'RESPONSE_DELAY_TIME',
            unit: 'bittimes',
            description: 'Response delay time',
            type: TODO,
            calc: TODO
        };
        case 0x1e: return {
            vif: 'RETRY',
            unit: '',
            description: 'Retry',
            type: TODO,
            calc: TODO
        };
        //Reserved primary VIF 0x1f
        case 0x20: return {
            vif: 'FIRST_STORAGE_CYCLIC',
            unit: '',
            description: 'First storage # for cyclic storage',
            type: TODO,
            calc: TODO
        };
        case 0x21: return {
            vif: 'LAST_STORAGE_CYCLIC',
            unit: '',
            description: 'Last storage # for cyclic storage',
            type: TODO,
            calc: TODO
        };
        case 0x22: return {
            vif: 'SIZE_STORAGE_BLOCK',
            unit: '',
            description: 'Size of storage block',
            type: TODO,
            calc: TODO
        };
        //Reserved primary VIF 0x23
        case 0x24: return {
            vif: 'SIZE_STORAGE_INTERVAL',
            unit: 's',
            description: 'Storage interval ',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x25: return {
            vif: 'SIZE_STORAGE_INTERVAL',
            unit: 'min',
            description: 'Storage interval ',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x26: return {
            vif: 'SIZE_STORAGE_INTERVAL',
            unit: 'h',
            description: 'Storage interval ',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x27: return {
            vif: 'SIZE_STORAGE_INTERVAL',
            unit: 'd',
            description: 'Storage interval ',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x28: return {
            vif: 'SIZE_STORAGE_INTERVAL',
            unit: 'months',
            description: 'Storage interval',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x29: return {
            vif: 'SIZE_STORAGE_INTERVAL',
            unit: 'years',
            description: 'Storage interval',
            type: TYPE_NUMBER,
            calc: val => val
        };
        //Reserved primary VIF 0x2a, 0x2b
        case 0x2c: return {
            vif: 'DURATION_SINCE_LAST_READ',
            unit: '',
            description: 'Duration since last readout',
            type: TODO,
            calc: TODO
        };
        case 0x2d: return {
            vif: 'DURATION_SINCE_LAST_READ',
            unit: '',
            description: 'Duration since last readout',
            type: TODO,
            calc: TODO
        };
        case 0x2e: return {
            vif: 'DURATION_SINCE_LAST_READ',
            unit: '',
            description: 'Duration since last readout',
            type: TODO,
            calc: TODO
        };
        case 0x2f: return {
            vif: 'DURATION_SINCE_LAST_READ',
            unit: '',
            description: 'Duration since last readout',
            type: TODO,
            calc: TODO
        };
        case 0x30: return {
            vif: 'TARIFF_START',
            unit: '',
            description: 'Start of tariff',
            type: TYPE_DATE_TIME,
            calc: calcDateTime
        };
        case 0x31: return {
            vif: 'TARIFF_DURATION',
            unit: 'min',
            description: 'Duration of tariff',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x32: return {
            vif: 'TARIFF_DURATION',
            unit: 'h',
            description: 'Duration of tariff',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x33: return {
            vif: 'TARIFF_DURATION',
            unit: 'd',
            description: 'Duration of tariff',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x34: return {
            vif: 'TARIFF_PERIOD',
            unit: 's',
            description: 'Period of tariff',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x35: return {
            vif: 'TARIFF_PERIOD',
            unit: 'min',
            description: 'Period of tariff',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x36: return {
            vif: 'TARIFF_PERIOD',
            unit: 'h',
            description: 'Period of tariff',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x37: return {
            vif: 'TARIFF_PERIOD',
            unit: 'd',
            description: 'Period of tariff',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x38: return {
            vif: 'TARIFF_PERIOD',
            unit: 'months',
            description: 'Period of tariff',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x39: return {
            vif: 'TARIFF_PERIOD',
            unit: 'years',
            description: 'Period of tariff',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x3a: return {
            vif: 'DIMENSIONLESS',
            unit: '',
            description: 'Dimensionless',
            type: TYPE_NUMBER,
            calc: val => val
        };
        //Reserved primary VIF 0x3b - 0x3f
        case 0x40: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val / 1000000000
        };
        case 0x41: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val / 100000000
        };
        case 0x42: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val / 10000000
        };
        case 0x43: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val / 1000000
        };
        case 0x44: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val / 100000
        };
        case 0x45: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val / 10000
        };
        case 0x46: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x47: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x48: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x49: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x4a: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val * 10
        };
        case 0x4b: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val * 100
        };
        case 0x4c: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val * 1000
        };
        case 0x4d: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val * 10000
        };
        case 0x4e: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val * 100000
        };
        case 0x4f: return {
            vif: 'ELECTRICAL_VOLTAGE',
            unit: 'V',
            description: 'Voltage',
            type: TYPE_NUMBER,
            calc: val => val * 1000000
        };
        case 0x50: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val / 1000000000000
        };
        case 0x51: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val / 100000000000
        };
        case 0x52: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val / 10000000000
        };
        case 0x53: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val / 1000000000
        };
        case 0x54: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val / 100000000
        };
        case 0x55: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val / 10000000
        };
        case 0x56: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val / 1000000
        };
        case 0x57: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val / 100000
        };
        case 0x58: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val / 10000
        };
        case 0x59: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val / 1000
        };
        case 0x5a: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val / 100
        };
        case 0x5b: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val / 10
        };
        case 0x5c: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x5d: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val * 10
        };
        case 0x5e: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val * 100
        };
        case 0x5f: return {
            vif: 'ELECTRICAL_CURRENT',
            unit: 'A',
            description: 'Current',
            type: TYPE_NUMBER,
            calc: val => val * 1000
        };
        case 0x60: return {
            vif: 'RESET_COUNTER',
            unit: '',
            description: 'Reset counter',
            type: TODO,
            calc: TODO
        };
        case 0x61: return {
            vif: 'CUMULATION_COUNTER',
            unit: '',
            description: 'Cumulation counter',
            type: TODO,
            calc: TODO
        };
        case 0x62: return {
            vif: 'CONTROL_SIGNAL',
            unit: '',
            description: 'Control signal',
            type: TODO,
            calc: TODO
        };
        case 0x63: return {
            vif: 'DAY_OF_WEEK',
            unit: '',
            description: 'Day of week',
            type: TYPE_STRING,
            calc: val => val
        };
        case 0x64: return {
            vif: 'WEEK_NUMBER',
            unit: '',
            description: 'Week number',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x65: return {
            vif: 'TIME_POINT_DAY_CHANGE',
            unit: '',
            description: 'Time point of day change',
            type: TYPE_DATE_TIME,
            calc: calcDateTime
        };
        case 0x66: return {
            vif: 'STATE_OF_PARAM_ACTIVATION',
            unit: '',
            description: 'State of parameter activation',
            type: TODO,
            calc: TODO
        };
        case 0x67: return {
            vif: 'SPECIAL_SUPPLIER_INFO',
            unit: '',
            description: 'Special supplier information',
            type: TODO,
            calc: TODO
        };
        case 0x68: return {
            vif: 'DURATION_SINCE_CUMULATION',
            unit: 's',
            description: 'Duration since last cumulation',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x69: return {
            vif: 'DURATION_SINCE_CUMULATION',
            unit: 'min',
            description: 'Duration since last cumulation',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x6a: return {
            vif: 'DURATION_SINCE_CUMULATION',
            unit: 'h',
            description: 'Duration since last cumulation',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x6b: return {
            vif: 'DURATION_SINCE_CUMULATION',
            unit: 'd',
            description: 'Duration since last cumulation',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x6c: return {
            vif: 'OPERATING_TIME_BATTERY',
            unit: 's',
            description: 'Operating time battery',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x6d: return {
            vif: 'OPERATING_TIME_BATTERY',
            unit: 'min',
            description: 'Operating time battery',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x6e: return {
            vif: 'OPERATING_TIME_BATTERY',
            unit: 'h',
            description: 'Operating time battery',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x6f: return {
            vif: 'OPERATING_TIME_BATTERY',
            unit: 'd',
            description: 'Operating time battery',
            type: TYPE_NUMBER,
            calc: val => val
        };
        case 0x70: return {
            vif: 'DATETIME_BATTERY_CHANGE',
            unit: '',
            description: 'Date and time of battery change',
            type: TYPE_DATE_TIME,
            calc: calcDateTime
        };
        case 0x71: return {
            vif: 'RECEPTION_LEVEL',
            unit: 'dBm',
            description: 'Reception level',
            type: TYPE_NUMBER,
            calc: val => val
        };
        //Reserved primary VIF 0x72 - 0x7f
        //0x19; 0x1f; 0x23; 0x2a; 0x2b; 0x3b - 0x3f;
        default: return {
            vif: 'UNKNOWN',
            unit: '',
            description: `Unknown VIF 0x${vifValue.toString(16)}`,
            type: TYPE_NUMBER,
            calc: val => val
        };
    }
}
