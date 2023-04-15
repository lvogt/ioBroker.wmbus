'use strict';

// CI field
const CI_SND_UD_MODE_1 = 0x51; // The master can send data to a slave using a SND_UD with CI-Field 51h for mode 1 or 55h for mode 2

const CI_RESP_4 = 0x7a; // Response from device, 4 Bytes
const CI_RESP_12 = 0x72; // Response from device, 12 Bytes
const CI_RESP_0 = 0x78; // Response from device, 0 Byte header, variable length
const CI_RESP_SML_4 = 0x7e; // Response from device, 4 Bytes, application layer SML encoded
const CI_RESP_SML_12 = 0x7f; // Response from device, 12 Bytes, application layer SML encoded
const CI_RESP_KAMSTRUP_COMPACT = 0x79; // Response from device, no header, Kamstrup(?) compact frame without data record header

const CI_ELL_2 = 0x8c; // Extended Link Layer, 2 Bytes - OMS
const CI_ELL_8 = 0x8d; // Extended Link Layer, 8 Bytes
const CI_ELL_10 = 0x8e; // Extended Link Layer, 10 Bytes - OMS
const CI_ELL_16 = 0x8f; // Extended Link Layer, 16 Bytes

const CI_AFL = 0x90; // Authentification and Fragmentation Layer, variable size

const ENC_MODE_5 = 'MODE-5';
const ENC_MODE_7 = 'MODE-7';
const ENC_ELL = 'ELL';

const DR_UNKNOWN = 'unknown';
const DR_NUMBER = 'number';
const DR_STRING = 'string';

const AES_BLOCK_SIZE = 16;

const DIF_VIF_EXTENSION_BIT = 0x80;
const DIF_VIF_EXTENSION_MASK = 0x7f;
const DIF_FILL_BYTE = 0x2f;
const DIF_DATATYPE_NONE = 0x00;
const DIF_DATATYPE_INT8 = 0x01;
const DIF_DATATYPE_INT16 = 0x02;
const DIF_DATATYPE_INT24 = 0x03;
const DIF_DATATYPE_INT32 = 0x04;
const DIF_DATATYPE_FLOAT32 = 0x05;
const DIF_DATATYPE_INT48 = 0x06;
const DIF_DATATYPE_INT64 = 0x07;
const DIF_DATATYPE_READOUT = 0x08;
const DIF_DATATYPE_BCD2 = 0x09;
const DIF_DATATYPE_BCD4 = 0x0a;
const DIF_DATATYPE_BCD6 = 0x0b;
const DIF_DATATYPE_BCD8 = 0x0c;
const DIF_DATATYPE_VARLEN = 0x0d;
const DIF_DATATYPE_BCD12 = 0x0e;
const DIF_SPECIAL_FUNCTIONS = 0x0f;

const SimpleLogger = require('../SimpleLogger');

const handleCrc = require('./WmbusCrcHelper');
const { calcCrc, decodeBCD, getDeviceType, getDeviceState, getMeterId, decodeManufacturer } = require('./WmbusTools');
const { createLegacyResult, createResult } = require('./WmbusDataRecordInterpreter');
const TchHandler = require('./handler/TchApplicationLayerHandler');

const { aesCmac } = require('node-aes-cmac');
const { createDecipheriv } = require('crypto');

class WmbusParser {

    constructor(loggerFunction) {
        this.log = new SimpleLogger(loggerFunction);

        this.log.setPrefix('WMBUS');

        this.data = Buffer.alloc(0);
        this.aesKey = Buffer.alloc(0);
        this.dataPos = 0;

        this.dataRecordHeaderCache = new Map();
        this.unknownFrameCrcs = [];

        this.aplHandlers = [
            new TchHandler()
        ];

        this.telegram = this.createEmptyTelegramData();
    }

    parse(rawData, containsCrc, aesKey) {
        this.data = handleCrc(rawData, containsCrc);
        this.aesKey = aesKey;

        this.decodeLinkLayer();
        this.decodeExtendedLinkLayer();
        this.decodeAuthenticationAndFragmentationLayer();
        this.decodeApplicationLayer();
        if (!this.telegram.applicationLayer.manufacturerSpecificHandler) {
            this.decodeDataRecords();
        }
        return createLegacyResult(this.telegram.dataRecords);
    }

    registerAplHandler(handler) {
        this.aplHandlers.push(handler);
    }

    resetTelegramData() {
        this.data = Buffer.alloc(0);
        this.aesKey = Buffer.alloc(0);
        this.dataPos = 0;

        this.telegram = this.createEmptyTelegramData();
    }

    createEmptyTelegramData() {
        return {
            linkLayer: {},
            extendedLinkLayer: {},
            authenticationAndFragmentationLayer: {},
            applicationLayer: {},
            config: {},
            /** @type {any[]}} */
            dataRecords: [],
            wiredFrame: false
        };
    }

    decodeLinkLayer() {
        // wired frame
        if (this.data[0] == 0x68 && this.data[3] == 0x68 && this.data[this.data.length - 1] == 0x16) {
            this.dataPos = 6;
            this.telegram.wiredFrame = true;
            this.telegram.linkLayer = {
                lField: this.data[1],
                cField: this.data[4],
                aField: this.data[5]
            };
            return;
        }

        this.dataPos = 10;

        this.telegram.linkLayer = {
            lField: this.data[0],
            cField: this.data[1],
            mField: this.data.readUInt16LE(2),
            aField: this.data.readUInt32LE(4),
            version: this.data[8],
            type: this.data[9],

            addressRaw: Buffer.from(this.data.subarray(2, 10)),
            aFieldRaw: Buffer.from(this.data.subarray(4, 10)),

            manufacturer: decodeManufacturer(this.data.readUInt16LE(2)),
            typeString: getDeviceType(this.data[9]),
            meterId: getMeterId(this.data, 4)
        };
    }

    decodeExtendedLinkLayer() {
        const ci = this.data[this.dataPos];

        if ((ci < CI_ELL_2) || (ci > CI_ELL_16)) {
            return {};
        }

        const ell = this.telegram.extendedLinkLayer;
        ell.ci = ci;

        this.log.debug('Extended Link Layer');
        this.dataPos++;

        // common to all headers
        ell.communicationControl = this.data[this.dataPos++];
        ell.accessNumber = this.data[this.dataPos++];

        switch (ell.ci) {
            case CI_ELL_2: // OMS - nothing more to do here
            case CI_ELL_8: // sessionNumber / payload CRC see below
                break;
            case CI_ELL_10: // OMS
            case CI_ELL_16:
                ell.manufacturer = this.data.readUInt16LE(this.dataPos);
                this.dataPos += 2;
                ell.address = this.data.subarray(this.dataPos, this.dataPos + 6);
                this.dataPos += 6;
                // sessionNumber see below
                break;
            default:
                throw new Error(`Unknown ExtendedLinkLayer CI: 0x${ell.ci.toString(16)}`);
        }

        if ((ell.ci == CI_ELL_8) || (ell.ci == CI_ELL_16)) {
            ell.sessionNumber = this.data.readUInt32LE(this.dataPos);
            this.dataPos += 4;
            // payload CRC is part of (encrypted) payload - so deal with it later

            ell.sessionNumberEnc = (ell.sessionNumber & 0b11100000000000000000000000000000) >> 29;
            ell.sessionNumberTime = (ell.sessionNumber & 0b00011111111111111111111111110000) >> 4; //unused
            ell.sessionNumberSession = ell.sessionNumber & 0b00000000000000000000000000001111; //unused

            const isEncrypted = ell.sessionNumberEnc != 0;

            // is this already decrypted? check against CRC
            let crc = this.data.readUInt16LE(this.dataPos);
            let crcCalc = calcCrc(this.data, this.dataPos + 2, this.data.length);

            if (crc == crcCalc) {
                this.log.debug('ELL encryption found, but data already seems to be decrypted - CRC match');
                this.dataPos += 2;
                return ell;
            }

            if (!isEncrypted) {
                return ell;
            }

            const length = this.data.length - this.dataPos;
            this.decryptInPlace(this.dataPos, length, ENC_ELL);

            crc = this.data.readUInt16LE(this.dataPos);
            this.dataPos += 2;
            crcCalc = calcCrc(this.data, this.dataPos, this.data.length);
            if (crc != crcCalc) {
                throw new Error(`Payload CRC check failed on ExtendedLinkLayer${(isEncrypted ? ', wrong AES key?' : '')}`);
            } else {
                return ell;
            }
        } else {
            return ell;
        }
    }

    decodeAuthenticationAndFragmentationLayer() {
        const ci = this.data[this.dataPos];
        if (ci != CI_AFL) {
            return {};
        }

        const afl = this.telegram.authenticationAndFragmentationLayer;

        afl.ci = this.data[this.dataPos++];
        afl.afll = this.data[this.dataPos++];

        afl.fcl = this.data.readUInt16LE(this.dataPos);
        this.dataPos += 2;

        /* 0b1000000000000000 - reserved */
        afl.fclMf = (afl.fcl & 0b0100000000000000) !== 0; /* More fragments: 0 last fragment; 1 more following */
        afl.fclMclp = (afl.fcl & 0b0010000000000000) !== 0; /* Message Control Field present in fragment */
        afl.fclMlp = (afl.fcl & 0b0001000000000000) !== 0; /* Message Length Field present in fragment */
        afl.fclMcrp = (afl.fcl & 0b0000100000000000) !== 0; /* Message Counter Field present in fragment */
        afl.fclMacp = (afl.fcl & 0b0000010000000000) !== 0; /* MAC Field present in fragment */
        afl.fclKip = (afl.fcl & 0b0000001000000000) !== 0; /* Key Information present in fragment */
        /* 0b0000000100000000 - reserved */
        afl.fclFid = afl.fcl & 0b0000000011111111; /* fragment ID */

        if (afl.fclMclp) {
            // AFL Message Control Field (AFL.MCL)
            afl.mcl = this.data[this.dataPos++];
            /* 0b10000000 - reserved */
            afl.mclMlmp = (afl.mcl & 0b01000000) !== 0; /* Message Length Field present in message */
            afl.mclMcmp = (afl.mcl & 0b00100000) !== 0; /* Message Counter Field present in message */
            afl.mclKimp = (afl.mcl & 0b00010000) !== 0; /* Key Information Field present in message */
            afl.mclAt = (afl.mcl & 0b00001111); /* Authentication-Type */
        }

        if (afl.fclKip) {
            // AFL Key Information Field (AFL.KI)
            afl.ki = this.data.readUInt16LE(this.dataPos);
            this.dataPos += 2;
            afl.kiKeyVersion = (afl.ki & 0b1111111100000000) >> 8;
            /* 0b0000000011000000 - reserved */
            afl.kiKdfSelection = (afl.ki & 0b0000000000110000) >> 4;
            afl.kiKeyId = (afl.ki & 0b0000000000001111);
        }

        if (afl.fclMcrp) {
            // AFL Message Counter Field (AFL.MCR)
            afl.mcr = this.data.readUInt32LE(this.dataPos);
            this.log.debug(`AFL MC ${afl.mcr}`);
            this.dataPos += 4;
        }
        if (afl.fclMacp) {
            // AFL MAC Field (AFL.MAC)
            // length of the MAC field depends on AFL.MCL.AT indicated by the AFL.MCL field
            // currently only AT = 5 is used (AES-CMAC-128 8bytes truncated)
            let mac_len = 0;
            if (afl.mclAt == 4) {
                mac_len = 4;
            } else if (afl.mclAt == 5) {
                mac_len = 8;
            } else if (afl.mclAt == 6) {
                mac_len = 12;
            } else if (afl.mclAt == 7) {
                mac_len = 16;
            }
            afl.mac = this.data.subarray(this.dataPos, this.dataPos + mac_len);
            this.dataPos += mac_len;
            this.log.debug(`AFL MAC ${afl.mac.toString('hex')}`);
        }
        if (afl.fclMlp) {
            // AFL Message Length Field (AFL.ML)
            afl.ml = this.data.readUInt16LE(this.dataPos);
            this.dataPos += 2;
        }
    }

    decodeConfigword(cw) {
        const config = this.telegram.config;
        config.mode = (cw & 0b0001111100000000) >> 8;
        switch (config.mode) {
            case 0:
            case 5:
                config.bidirectional = (cw & 0b1000000000000000) >> 15; /* mode 5 */
                config.accessability = (cw & 0b0100000000000000) >> 14; /* mode 5 */
                config.synchronous = (cw & 0b0010000000000000) >> 13; /* mode 5 */
                /* 0b0001111100000000 - mode */
                config.encryptedBlocks = (cw & 0b0000000011110000) >> 4;  /* mode 5 + 7 */
                config.content = (cw & 0b0000000000001100) >> 2;  /* mode 5 */
                config.hopCounter = (cw & 0b0000000000000011);       /* mode 5 */
                break;
            case 7:
                config.content = (cw & 0b1100000000000000) >> 14; /* mode 7 + 13 */
                /* 0b0010000000000000 - reserved for counter size
                   0b0001111100000000 - mode */
                config.encryptedBlocks = (cw & 0b0000000011110000) >> 4;  /* mode 5 + 7 */
                /* 0b0000000000001111 - reserved for counter index */
                break;
            case 13:
                config.content = (cw & 0b1100000000000000) >> 14; /* mode 7 + 13 */
                /* 0b0010000000000000 - reserved
                   0b0001111100000000 - mode */
                config.encryptedBytes = cw & 0b0000000011111111;  /* mode 13 */
                break;
        }
    }

    decodeConfigwordExt(cwe) {
        const config = this.telegram.config;
        if (config.mode == 7) {
            /* 0b10000000 - reserved
               0b01000000 - reserved for version */
            config.kdfSel = (cwe & 0b00110000) >> 4;
            config.keyid = cwe & 0b00001111;
            return;
        }

        if (config.mode == 13) {
            /* 0b11110000 - reserved */
            config.protoType = cwe & 0b00001111;
            return;
        }
    }

    decodeApplicationLayer() {
        const apl = this.telegram.applicationLayer;

        apl.offset = this.dataPos;
        apl.ci = this.data[this.dataPos++];

        switch (apl.ci) {
            case CI_RESP_0:
            case CI_SND_UD_MODE_1: // no header
                break;

            case CI_RESP_4:
            case CI_RESP_SML_4:
                apl.accessNo = this.data[this.dataPos++];
                apl.status = this.data[this.dataPos++];
                this.decodeConfigword(this.data.readUInt16LE(this.dataPos));
                this.dataPos += 2;
                if (this.telegram.config.mode == 7 || this.telegram.config.mode == 13) {
                    this.decodeConfigwordExt(this.data[this.dataPos++]);
                }
                apl.statusString = getDeviceState(apl.status);
                break;

            case CI_RESP_12:
            case CI_RESP_SML_12:
                apl.meterId = this.data.readUInt32LE(this.dataPos);
                this.dataPos += 4;
                apl.meterManufacturer = this.data.readUInt16LE(
                    this.dataPos
                );
                this.dataPos += 2;
                apl.meterVersion = this.data[this.dataPos++];
                apl.meterDevice = this.data[this.dataPos++];
                apl.accessNo = this.data[this.dataPos++];
                apl.status = this.data[this.dataPos++];
                this.decodeConfigword(this.data.readUInt16LE(this.dataPos));
                this.dataPos += 2;
                if (this.telegram.config.mode == 7 || this.telegram.config.mode == 13) {
                    this.decodeConfigwordExt(this.data[this.dataPos++]);
                }

                apl.meterIdString = getMeterId(this.data, this.dataPos);
                apl.meterDeviceString = getDeviceType(apl.meterDevice);
                apl.meterManufacturerString = decodeManufacturer(apl.meterManufacturer);
                apl.statusString = getDeviceState(apl.status);
                break;

            case CI_RESP_KAMSTRUP_COMPACT:
                apl.compactFrameHeaderCrc = this.data.readUInt16LE(this.dataPos);
                this.dataPos += 2;
                apl.compactFullFrameCrc = this.data.readUInt16LE(this.dataPos); // this is currently unused
                this.dataPos += 2;

                apl.cachedDataRecordHeaders = this.dataRecordHeaderCache.get(apl.compactFrameHeaderCrc);
                if (!apl.cachedDataRecordHeaders) {
                    this.unknownFrameCrcs.push(apl.compactFrameHeaderCrc);
                    throw new Error('Found unknown compact frame header - waiting for full frame');
                }
                break;
            default:
                for (const handler of this.aplHandlers) {
                    if (handler.isApplicable(this.telegram, this.data)) {
                        return handler.decode(this.telegram, this.data);
                    }
                }
                throw new Error(`Unsupport CI Field 0x${apl.ci.toString(16)}\nremaining payload is ${this.data.toString('hex', this.dataPos)}`);
        }

        if (this.telegram.wiredFrame) {
            this.mockLinkLayerFromApplicationLayer();
        }

        switch (this.telegram.config.mode) {
            case 0: // no encryption
                break;

            case 5: // data is encrypted with AES 128, dynamic init vector
            // decrypt data before further processing
            case 7: // eslint-disable-line no-fallthrough
                {
                    // ephemeral key is used (see 9.2.4)
                    if (!this.aesKey.length) {
                        throw new Error('Encrypted telegram but no AES key provided');
                    }

                    const encryptedLength = this.telegram.config.encryptedBlocks * AES_BLOCK_SIZE;
                    if (this.telegram.config.mode == 5) {
                        this.decryptInPlace(this.dataPos, encryptedLength, ENC_MODE_5);
                    } else { // mode 7
                        this.decryptInPlace(this.dataPos, encryptedLength, ENC_MODE_7);
                    }

                    if (this.data.readUInt16LE(this.dataPos) != 0x2F2F) {
                        throw new Error('Decryption failed, wrong key?');
                    }
                }
                break;

            default:
                throw new Error(`Encryption mode ${this.telegram.config.mode.toString(16)} not implemented`);
        }

        if (apl.ci == CI_RESP_SML_4 || apl.ci == CI_RESP_SML_12) {
            // payload is SML encoded, that's not implemented
            throw new Error('Payload is SML encoded. SML decoding is not implemented');
        }
    }

    mockLinkLayerFromApplicationLayer() {
        // copy over application data meter and address info to link layer data for compatibility
        const apl = this.telegram.applicationLayer;

        const aFieldRaw = Buffer.alloc(6);
        aFieldRaw.writeUInt32LE(apl.meterId, 0);
        aFieldRaw[4] = apl.meterVersion;
        aFieldRaw[5] = apl.meterType;

        const addressRaw = Buffer.alloc(8);
        addressRaw.writeUInt32LE(apl.meterManufacturer, 0);
        addressRaw.writeUInt32LE(apl.meterId, 2);
        addressRaw[6] = apl.meterVersion;
        addressRaw[7] = apl.meterType;

        this.telegram.linkLayer = {
            lField: this.telegram.linkLayer.lField,
            cField: this.telegram.linkLayer.cField,
            mField: apl.meterManufacturer,
            aField: this.telegram.linkLayer.aField,
            version: apl.meterVersion,
            type: apl.meterDevice,

            addressRaw: addressRaw,
            aFieldRaw: aFieldRaw,

            manufacturer: apl.meterManufacturerString,
            typeString: apl.meterDeviceString,
            meterId: apl.meterIdString
        };
    }

    decodeDataRecords() {
        while (this.dataPos < this.data.length) {
            while (this.data[this.dataPos] === DIF_FILL_BYTE) {
                this.dataPos++;
                if (this.dataPos >= this.data.length) {
                    return;
                }
            }

            if (!this.decodeDataRecord()) {
                return;
            }
        }

        if (this.unknownFrameCrcs.length) {
            const frameCrc = this.calcFrameCrc(this.telegram.dataRecords);
            const idx = this.unknownFrameCrcs.findIndex(crc => crc === frameCrc);

            if (idx !== -1) {
                this.dataRecordHeaderCache.set(frameCrc, this.cloneDataRecordHeaders());
                this.unknownFrameCrcs = this.unknownFrameCrcs.filter(crc => crc !== frameCrc);
            }
        }

        return;
    }

    cloneDataRecordHeaders() {
        const result = [];

        this.telegram.dataRecords.forEach(record => {
            result.push(JSON.parse(JSON.stringify(record.header)));
        });

        return result;
    }

    calcFrameCrc(dataRecords) {
        let crcBuffer = Buffer.alloc(0);
        dataRecords.forEach((record) => {
            const offset = record.header.offset;
            crcBuffer = Buffer.concat([crcBuffer, this.data.subarray(offset, offset + record.header.length)]);
        });

        return calcCrc(crcBuffer, 0, crcBuffer.length);
    }

    decodeDataInformationBlock() {
        const dib = {
            tariff: 0,
            devUnit: 0,
            storageNo: 0,
            functionField: 0,
            dataField: 0
        };

        let dif = this.data[this.dataPos++];
        let difExtNo = 0;

        dib.storageNo = (dif & 0b01000000) >> 6;
        dib.functionField = (dif & 0b00110000) >> 4;
        dib.dataField = dif & 0b00001111;

        while (dif & DIF_VIF_EXTENSION_BIT) {
            if (this.dataPos >= this.data.length) {
                this.log.debug('No data but DIF extension bit still set!');
                break;
            }
            dif = this.data[this.dataPos++];

            if (difExtNo > 9) {
                this.log.debug('Too many DIF extensions!');
                break;
            }

            dib.storageNo |= (dif & 0b00001111) << (difExtNo * 4 + 1);
            dib.tariff |= (dif & (0b00110000 >> 4)) << (difExtNo * 2);
            dib.devUnit |= (dif & (0b01000000 >> 6)) << difExtNo;
            difExtNo++;
        }

        return dib;
    }

    getPrimaryVIF() {
        const primaryVIF = {
            vif: this.data[this.dataPos++],
            table: 'primary',
            plain: '',
            extensionFollows: false
        };

        if (primaryVIF.vif == 0xFB) {
            primaryVIF.table = 'fb';
            primaryVIF.vif = this.data[this.dataPos++];
        } else if (primaryVIF.vif == 0xFD) {
            primaryVIF.table = 'fd';
            primaryVIF.vif = this.data[this.dataPos++];
        } else if (primaryVIF.vif == 0xFF) {
            primaryVIF.table = 'manufacturer';
            primaryVIF.vif = this.data[this.dataPos++];
        } else if (primaryVIF.vif == 0x7C || primaryVIF.vif == 0xFC) {
            primaryVIF.table = 'plain';

            const length = this.data[this.dataPos++];
            if (length + this.dataPos >= this.data.length) {
                this.log.debug('Not enough bytes left for plain text VIF!');
                return primaryVIF;
            }
            primaryVIF.plain = this.data.toString('ascii', this.dataPos, this.dataPos + length).split('').reverse().join('');
            this.dataPos += length;
        }

        primaryVIF.extensionFollows = (primaryVIF.vif & DIF_VIF_EXTENSION_BIT) > 0;
        primaryVIF.vif &= DIF_VIF_EXTENSION_MASK;

        return primaryVIF;
    }

    decodeValueInformationBlock() {
        const vib = [];
        let extensionFollows;

        const primary = this.getPrimaryVIF();
        vib.push(primary);

        extensionFollows = primary.extensionFollows;

        while (extensionFollows) {
            if (vib.length > 11) {
                throw new Error('Too many VIF extensions!');
            }

            if (this.dataPos + 1 >= this.data.length) {
                throw new Error('No data left but VIF extension bit still set!');
            }

            const rawVif = this.data[this.dataPos++];
            extensionFollows = (rawVif & DIF_VIF_EXTENSION_BIT) > 0;

            const vif = {
                vif: rawVif & DIF_VIF_EXTENSION_MASK,
                table: 'extension',
                plain: '',
                extensionFollows: extensionFollows
            };

            vib.push(vif);
        }

        return vib;
    }

    decodeDataRecordValue(dataRecordHeader) {
        const dataRecord = {
            header: dataRecordHeader,
            type: DR_NUMBER,
            value: 0,
            stringValue: ''
        };

        switch (dataRecordHeader.dib.dataField) {
            case DIF_DATATYPE_NONE:
                this.dataPos++;
                this.log.debug('DIF_NONE found!');
                dataRecord.type = DR_UNKNOWN;
                return dataRecord;
            case DIF_DATATYPE_READOUT:
                this.dataPos++;
                this.log.debug('DIF_READOUT found!');
                dataRecord.type = DR_UNKNOWN;
                return dataRecord;
            case DIF_DATATYPE_BCD2:
                dataRecord.value = decodeBCD(2, this.data, this.dataPos);
                this.dataPos += 1;
                return dataRecord;
            case DIF_DATATYPE_BCD4:
                dataRecord.value = decodeBCD(4, this.data, this.dataPos);
                this.dataPos += 2;
                return dataRecord;
            case DIF_DATATYPE_BCD6:
                dataRecord.value = decodeBCD(6, this.data, this.dataPos);
                this.dataPos += 3;
                return dataRecord;
            case DIF_DATATYPE_BCD8:
                dataRecord.value = decodeBCD(8, this.data, this.dataPos);
                this.dataPos += 4;
                return dataRecord;
            case DIF_DATATYPE_BCD12:
                dataRecord.value = decodeBCD(12, this.data, this.dataPos);
                this.dataPos += 6;
                return dataRecord;
            case DIF_DATATYPE_INT8:
                dataRecord.value = this.data.readInt8(this.dataPos);
                this.dataPos += 1;
                return dataRecord;
            case DIF_DATATYPE_INT16:
                dataRecord.value = this.data.readUInt16LE(this.dataPos);
                this.dataPos += 2;
                return dataRecord;
            case DIF_DATATYPE_INT24:
                dataRecord.value = this.data.readUIntLE(this.dataPos, 3);
                this.dataPos += 3;
                return dataRecord;
            case DIF_DATATYPE_INT32:
                dataRecord.value = this.data.readUInt32LE(this.dataPos);
                this.dataPos += 4;
                return dataRecord;
            case DIF_DATATYPE_INT48:
                dataRecord.value = this.data.readUIntLE(this.dataPos, 6);
                this.dataPos += 6;
                return dataRecord;
            case DIF_DATATYPE_INT64:
                dataRecord.value = Number(this.data.readBigUInt64LE(this.dataPos));
                this.dataPos += 8;
                return dataRecord;
            case DIF_DATATYPE_FLOAT32:
                dataRecord.value = this.data.readFloatLE(this.dataPos);
                this.dataPos += 4;
                return dataRecord;
            case DIF_DATATYPE_VARLEN:
                return this.decodeLvarValue(dataRecord);
            default:
                throw new Error(`Unknown DataInformationBlock.dataField type: 0x${dataRecordHeader.dib.dataField.toString(16)}`);
        }
    }

    decodeLvarValue(dataRecord) {
        let lvar = this.data[this.dataPos++];
        if (lvar <= 0xBF) { // ASCII string with lvar characters
            dataRecord.type = DR_STRING;
            dataRecord.stringValue = this.data
                .toString('ascii', this.dataPos, this.dataPos + lvar)
                .split('')
                .reverse()
                .join('');
            this.dataPos += lvar;
            return dataRecord;
        } else if (lvar <= 0xCF) { // positive BCD number with (lvar - 0xC0) * 2 digits
            lvar -= 0xC0;
            dataRecord.value = decodeBCD(lvar * 2, this.data, this.dataPos);
            this.dataPos += lvar;
            return dataRecord;
        } else if (lvar <= 0xDF) { // negative BCD number with (lvar - 0xD0) * 2 digits
            lvar -= 0xD0;
            dataRecord.value = -1 * decodeBCD(lvar * 2, this.data, this.dataPos);
            this.dataPos += lvar;
            return dataRecord;
        } else if (lvar <= 0xEF) { // binary number (lvar - E0h) bytes
            lvar -= 0xE0;
            if (lvar <= 6) {
                dataRecord.value = this.data.readUIntLE(this.dataPos, lvar);
            } else {
                dataRecord.type = DR_STRING;
                dataRecord.stringValue = this.data.toString('hex', this.dataPos, this.dataPos + lvar);
            }
            this.dataPos += lvar;
            return dataRecord;
        } else if (lvar <= 0xFA) { // floating point number with (lvar - F0h) bytes [to be defined]
            throw new Error(`Unhandled LVAR field 0x${lvar.toString(16)} - floating point number?`);
        } else {
            throw new Error(`Unhandled LVAR field 0x${lvar.toString(16)}`);
        }
    }

    decodeDataRecord() {
        const dataRecordHeader = this.getDataRecordHeader();

        if (dataRecordHeader === false) {
            return false;
        }

        try {
            const dataRecord = this.decodeDataRecordValue(dataRecordHeader);
            this.telegram.dataRecords.push(dataRecord);
        } catch (e) {
            throw new Error('Not enough data for DataInformationBlock.dataField type! Incomplete telegram data?');
        }

        return true;
    }

    getDataRecordHeader() {
        if (this.telegram.applicationLayer.cachedDataRecordHeaders) {
            return this.getDataRecordHeaderFromCache();
        } else {
            return this.getDataRecordHeaderFromData();
        }
    }

    getDataRecordHeaderFromCache() {
        const headers = this.telegram.applicationLayer.cachedDataRecordHeaders;
        const pos = this.telegram.dataRecords.length;
        return JSON.parse(JSON.stringify(headers[pos]));
    }

    getDataRecordHeaderFromData() {
        const drStart = this.dataPos;
        const dib = this.decodeDataInformationBlock();

        if (dib.dataField === DIF_SPECIAL_FUNCTIONS) {
            if (this.dataPos < this.data.length) {
                this.log.debug(`DIF for special function at ${this.dataPos}: ${this.data.toString('hex', this.dataPos)}`);
            }
            return false;
        }

        return {
            dib: dib,
            vib: this.decodeValueInformationBlock(),
            offset: drStart,
            length: this.dataPos - drStart
        };
    }


    createIv(mode) {
        let iv = Buffer.alloc(16, 0x00);

        if (!this.telegram.linkLayer) {
            throw new Error('Failed to create IV!');
        }

        switch (mode) {
            case ENC_MODE_5:
                if (!this.telegram.applicationLayer) {
                    throw new Error(`Failed to create IV for mode ${mode}!`);
                }

                iv = Buffer.alloc(16, this.telegram.applicationLayer.accessNo);
                if (this.telegram.applicationLayer.ci == CI_RESP_12 || this.telegram.applicationLayer.ci == CI_RESP_SML_12) {
                    iv.writeUInt16LE(this.telegram.applicationLayer.meterManufacturer, 0);
                    iv.writeUInt32LE(this.telegram.applicationLayer.meterId, 2);
                    iv.writeUInt8(this.telegram.applicationLayer.meterVersion, 6);
                    iv.writeUInt8(this.telegram.applicationLayer.meterDevice, 7);
                } else {
                    this.telegram.linkLayer.addressRaw.copy(iv, 0);
                }
                return iv;

            case ENC_MODE_7:
                return iv;

            case ENC_ELL:
                if (!this.telegram.extendedLinkLayer) {
                    throw new Error(`Failed to create IV for mode ${mode}!`);
                }
                // M-field, A-field, CC, SN, 000000
                if (this.telegram.extendedLinkLayer.ci == CI_ELL_10 || this.telegram.extendedLinkLayer.ci == CI_ELL_16) {
                    iv.writeInt16LE(this.telegram.extendedLinkLayer.manufacturer, 0);
                    this.telegram.extendedLinkLayer.address.copy(iv, 2);
                } else {
                    this.telegram.linkLayer.addressRaw.copy(iv, 0);
                }

                iv[8] = this.telegram.extendedLinkLayer.communicationControl & 0xef; // reset hop counter
                iv.writeUInt32LE(this.telegram.extendedLinkLayer.sessionNumber, 9);
                return iv;
        }
        throw new Error(`Unknown mode ${mode}`);
    }

    calcKenc(encryptedData) {
        if (!this.telegram.linkLayer || !this.telegram.authenticationAndFragmentationLayer
            || !this.telegram.applicationLayer || !this.aesKey.length) {
            throw new Error(`Failed to calculate Kenc`);
        }

        const msg = Buffer.alloc(16, 0x07);
        msg[0] = 0x00; // derivation constant (see. 9.5.3) 00 = Kenc (from meter) 01 = Kmac (from meter)
        msg.writeUInt32LE(this.telegram.authenticationAndFragmentationLayer.mcr, 1);

        if (this.telegram.applicationLayer.ci == CI_RESP_12 || this.telegram.applicationLayer.ci == CI_RESP_SML_12) {
            msg.writeUInt32LE(this.telegram.applicationLayer.meterId, 5);
        } else {
            msg.writeUInt32LE(this.telegram.linkLayer.aField, 5);
        }

        const kenc = aesCmac(this.aesKey, msg, { returnAsBuffer: true });
        this.log.debug(`Kenc: ${kenc.toString('hex')}`);


        msg[0] = 0x01; // derivation constant
        const kmac = aesCmac(this.aesKey, msg, { returnAsBuffer: true });
        this.log.debug(`Kmac: ${kmac.toString('hex')}`);
        this.checkAflMac(encryptedData, kmac);

        return kenc;
    }

    checkAflMac(encryptedData, kmac) {
        const afl = this.telegram.authenticationAndFragmentationLayer;

        let msg = Buffer.alloc(5 + (afl.fclMlp ? 2 : 0));
        msg[0] = afl.mcl;
        msg.writeUInt32LE(afl.mcr, 1);
        if (afl.fclMlp) {
            msg.writeUInt16LE(afl.ml, 5);
        }

        const tpl = this.data.subarray(this.telegram.applicationLayer.offset, this.dataPos);
        msg = Buffer.concat([msg, tpl, encryptedData]);
        const mac = aesCmac(kmac, msg, { returnAsBuffer: true });

        this.log.debug(`MAC: ${mac.toString('hex')}`);
        if (afl.mac.compare(mac.slice(0, 8)) != 0) {
            throw new Error(`Received MAC does not match. Corrupted data?\nMAC received: ${afl.mac.toString('hex')}`);
        }
    }

    decryptData(encryptedData, iv, key, algorithm) {
        const padding = encryptedData.length % 16;
        const length = encryptedData.length;

        const decipher = createDecipheriv(algorithm, key, iv);
        decipher.setAutoPadding(false);

        if (padding) {
            encryptedData = Buffer.concat([
                encryptedData,
                Buffer.alloc(16 - padding)
            ]);
        }

        const decryptedData = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final()
        ]);

        return decryptedData.subarray(0, length);
    }

    decryptInPlace(offset, length, mode) {
        if (!this.aesKey || !this.aesKey.length) {
            throw new Error(`${mode}: Encrypted data but no AES key was provided!`);
        }

        const algorithm = mode === ENC_ELL ? 'aes-128-ctr' : 'aes-128-cbc';
        const iv = this.createIv(mode);

        const encryptedData = this.data.subarray(offset, offset + length);
        const key = mode === ENC_MODE_7 ? this.calcKenc(encryptedData) : this.aesKey;

        this.log.debug(`Encrypted data: ${encryptedData.toString('hex')}`);
        this.log.debug(`IV: ${iv.toString('hex')}`);
        const decryptedData = this.decryptData(encryptedData, iv, key, algorithm);

        this.log.debug(`Decrypted data: ${decryptedData.toString('hex')}`);
        if (!decryptedData.length) {
            throw new Error(`Decryption failed! Mode: ${mode} IV: ${iv.toString('hex')}`);
        }

        this.data = Buffer.concat([
            this.data.subarray(0, offset),
            decryptedData,
            this.data.subarray(offset + length)
        ]);
    }
}

module.exports = WmbusParser;