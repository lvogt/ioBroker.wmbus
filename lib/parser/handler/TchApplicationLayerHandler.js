'use strict';

const ApplicationLayerHandler = require('./ApplicationLayerHandler');

const HCA_VERSIONS = [0x61, 0x64, 0x69, 0x94];


class TchApplicationLayerHandler extends ApplicationLayerHandler {

    isApplicable(telegram, rawData) {
        if (telegram.linkLayer.manufacturer !== 'TCH') {
            return false;
        }

        switch (telegram.linkLayer.type) {
            case 0x62: // Hot water meter
            case 0x72: // Cold water meter
                return (rawData.length >= 10);
            case 0x43: //Heat meter
            case 0x45: //Heat meter ???
                return rawData.length >= 11;

            case 0x80: //Heat cost allocator
                return (rawData.length >= 10) && (HCA_VERSIONS.findIndex(v => v == telegram.linkLayer.version) !== -1);

            default:
                return false;
        }
    }

    decode(telegram, rawData) {
        super.decode(telegram, rawData);

        switch (telegram.linkLayer.type) {
            case 0x62: // Hot water meter
            case 0x72: // Cold water meter
                return this.parseWaterMeter(telegram, rawData);

            case 0x43: //Heat meter
            case 0x45: //Heat meter ???
                return this.parseHeatMeter(telegram, rawData);

            case 0x80: //Heat cost allocator
                return this.parseHCA(telegram, rawData);

            case 0xF0: //Smoke detector
                throw new Error('Smoke detector support has been (temporarily) removed!');

            default:
                throw new Error(`Unsupported TCH type 0x${telegram.linkLayer.type.toString(16)}`);
        }
    }

    parseHCA(telegram, rawData) {

    }

    parseHeatMeter(telegram, rawData) {

    }

    parseWaterMeter(telegram, rawData) {

    }
}

module.exports = TchApplicationLayerHandler;