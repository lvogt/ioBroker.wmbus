'use strict';

const TYPE_NUMBER = 'number';
const TYPE_STRING = 'string';
const TYPE_DATE = 'date';
const TYPE_DATE_TIME = 'datetime';

const VIF_ENERGY_WATT_BASE = {
    unit: 'Wh',
    description: 'Energy',
    calc: null,
    type: TYPE_NUMBER,
    vif: 'VIF_ENERGY_WATT'
  }

function mapPrimaryVif(vif) {
    switch (vif) {
        case 0x00: return { ...VIF_ENERGY_WATT_BASE, calc: val => val / 1000 }
        case 0x06: return {
            unit: 'Wh',
            description: 'Energy',
            calc: val => val * 1000,
            type: TYPE_NUMBER,
            vif: 'VIF_ENERGY_WATT'
          }
        case 0x07: return {
            unit: 'Wh',
            description: 'Energy',
            calc: val => val * 10000,
            type: TYPE_NUMBER,
            vif: 'VIF_ENERGY_WATT'
          }
          
    }
}


const primary = [
    {
        vif: 0x00,
        unit: 'Wh',
        type: 'Number',
        calc: (val) => val / 1000,
        description: 'Energy',
        legacyName: 'VIF_ENERGY_WATT'
    },
    {
        vif: 0x01,
        unit: 'Wh',
        calc: (val) => val / 100,
        description: 'Energy',
        legacyName: 'VIF_ENERGY_WATT'
    },
];

const rangeCorrection = (val, exp) => val * Math.pow(10, exp);


const VIFInfo = {
    VIF_ENERGY_WATT:              { typeMask: 0b01111000, expMask: 0b00000111, type: 0b00000000, bias: -3, unit: 'Wh', calcFunc: 'numeric', description: 'Energy' }, // 10(nnn-3) Wh 0.001Wh to 10000Wh
    VIF_ENERGY_JOULE:             { typeMask: 0b01111000, expMask: 0b00000111, type: 0b00001000, bias:  0, unit: 'J',  calcFunc: 'numeric', description: 'Energy' }, // 10(nnn) J 0.001kJ to 10000kJ
    VIF_VOLUME:                   { typeMask: 0b01111000, expMask: 0b00000111, type: 0b00010000, bias: -6, unit: 'm³', calcFunc: 'numeric', description: 'Volume' }, // 10(nnn-6) m3 0.001l to 10000l
    VIF_MASS:                     { typeMask: 0b01111000, expMask: 0b00000111, type: 0b00011000, bias: -3, unit: 'kg', calcFunc: 'numeric', description: 'Mass' }, // 10(nnn-3) kg 0.001kg to 10000kg
    VIF_ON_TIME:                  { typeMask: 0b01111100, expMask: 0b00000011, type: 0b00100000, bias:  0, unit: '', calcFunc: 'timeperiod', description: 'On Time' }, // On time
    VIF_OP_TIME:                  { typeMask: 0b01111100, expMask: 0b00000011, type: 0b00100100, bias:  0, unit: '', calcFunc: 'timeperiod', description: 'Operating Time' }, // Operating Time
    VIF_ELECTRIC_POWER:           { typeMask: 0b01111000, expMask: 0b00000111, type: 0b00101000, bias: -3, unit: 'W',      calcFunc: 'numeric', description: 'Power' }, // 10(nnn-3) W 0.001W to 10000W
    VIF_THERMAL_POWER:            { typeMask: 0b01111000, expMask: 0b00000111, type: 0b00110000, bias:  0, unit: 'J/h',    calcFunc: 'numeric', description: 'Power' }, // 10(nnn) J/h 0.001kJ/h to 10000kJ/h
    VIF_VOLUME_FLOW:              { typeMask: 0b01111000, expMask: 0b00000111, type: 0b00111000, bias: -6, unit: 'm³/h',   calcFunc: 'numeric', description: 'Volume Flow' }, // 10(nnn-6) m3/h 0.001l/h to 10000l/h
    VIF_VOLUME_FLOW_EXT1:         { typeMask: 0b01111000, expMask: 0b00000111, type: 0b01000000, bias: -7, unit: 'm³/min', calcFunc: 'numeric', description: 'Volume Flow ext.' }, // 10(nnn-7) m3/min 0.0001l/min to 10000l/min
    VIF_VOLUME_FLOW_EXT2:         { typeMask: 0b01111000, expMask: 0b00000111, type: 0b01001000, bias: -9, unit: 'm³/s',   calcFunc: 'numeric', description: 'Volume Flow ext.' }, // 10(nnn-9) m3/s 0.001ml/s to 10000ml/s
    VIF_MASS_FLOW:                { typeMask: 0b01111000, expMask: 0b00000111, type: 0b01010000, bias: -3, unit: 'kg/h',   calcFunc: 'numeric', description: 'Mass Flow' }, // 10(nnn-3) kg/h 0.001kg/h to 10000kg/h
    VIF_FLOW_TEMP:                { typeMask: 0b01111100, expMask: 0b00000011, type: 0b01011000, bias: -3, unit: '°C',     calcFunc: 'numeric', description: 'Flow Temperature' }, // 10(nn-3) °C 0.001°C to 1°C
    VIF_RETURN_TEMP:              { typeMask: 0b01111100, expMask: 0b00000011, type: 0b01011100, bias: -3, unit: '°C',     calcFunc: 'numeric', description: 'Return Temperature' }, // 10(nn-3) °C 0.001°C to 1°C
    VIF_TEMP_DIFF:                { typeMask: 0b01111100, expMask: 0b00000011, type: 0b01100000, bias: -3, unit: 'K',      calcFunc: 'numeric', description: 'Temperature Difference' }, // 10(nn-3) K 1mK to 1000mK
    VIF_EXTERNAL_TEMP:            { typeMask: 0b01111100, expMask: 0b00000011, type: 0b01100100, bias: -3, unit: '°C',     calcFunc: 'numeric', description: 'External Temperature' }, // 10(nn-3) °C 0.001°C to 1°C
    VIF_PRESSURE:                 { typeMask: 0b01111100, expMask: 0b00000011, type: 0b01101000, bias: -3, unit: 'bar',    calcFunc: 'numeric', description: 'Pressure' }, // 10(nn-3) bar 1mbar to 1000mbar
    VIF_TIME_POINT_DATE:          { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01101100, bias:  0, unit: '', calcFunc: 'date', description: 'Time point' }, // data type G
    VIF_TIME_POINT_DATE_TIME:     { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01101101, bias:  0, unit: '', calcFunc: 'datetime', description: 'Time point' }, // data type F
    VIF_HCA:                      { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01101110, bias:  0, unit: '', description: 'Units for H.C.A.' }, // Unit for Heat Cost Allocator, dimensonless
    VIF_RES_E1101111:             { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01101111, bias:  0, unit: '', description: 'Reserved' }, // Reserved
    VIF_AVERAGING_DURATION:       { typeMask: 0b01111100, expMask: 0b00000011, type: 0b01110000, bias:  0, unit: '', calcFunc: 'timeperiod', description: 'Averaging Duration' }, // Avg duration
    VIF_ACTUALITY_DURATION:       { typeMask: 0b01111100, expMask: 0b00000011, type: 0b01110100, bias:  0, unit: '', calcFunc: 'timeperiod', description: 'Actuality Duration' }, // Act duration
    VIF_FABRICATION_NO:           { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01111000, bias:  0, unit: '', description: 'Fabrication No' }, // Fabrication No
    VIF_OWNER_NO:                 { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01111001, bias:  0, unit: '', description: 'Owner No' }, // Eigentumsnummer (used by Easymeter even though the standard allows this only for writing to a slave)
    //    VIF_ENHANCED:                 { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01111001, bias:  0, unit: '', description: "(Enhanced)" }, // see chapter 6.4.2
    VIF_BUS_ADDRESS:              { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01111010, bias:  0, unit: '', description: 'Bus Address' } // Bus address data type C x=8
};

const VIFInfo_FB = {
    VIF_ENERGY_MWH:               { typeMask: 0b01111110, expMask: 0b00000001, type: 0b00000000, bias: -1, unit: 'MWh', calcFunc: 'numeric', description: 'Energy' }, //  Energy 10(n-1) MWh  0.1MWh to 1MWh
    VIF_RES_E000001n:             { typeMask: 0b01111110, expMask: 0b00000001, type: 0b00000010, bias:  0, unit: '', description: 'Reserved' },
    VIF_RES_E00001nn:             { typeMask: 0b01111100, expMask: 0b00000011, type: 0b00000100, bias:  0, unit: '', description: 'Reserved' },
    VIF_ENERGY_GJ:                { typeMask: 0b01111110, expMask: 0b00000001, type: 0b00001000, bias: -1, unit: 'MWh', calcFunc: 'numeric', description: 'Energy' }, //  Energy 10(n-1)GJ 0.1GJ to 1GJ
    VIF_RES_E000101n:             { typeMask: 0b01111110, expMask: 0b00000001, type: 0b00001010, bias:  0, unit: '', description: 'Reserved' },
    VIF_RES_E00011nn:             { typeMask: 0b01111100, expMask: 0b00000011, type: 0b00001100, bias:  0, unit: '', description: 'Reserved' },
    VIF_VOLUME_CM:                { typeMask: 0b01111110, expMask: 0b00000001, type: 0b00010000, bias:  2, unit: 'm³', calcFunc: 'numeric', description: 'Volume' }, //  Volume 10(n+2)m3 100m3 to 1000m3
    VIF_RES_E001001n:             { typeMask: 0b01111110, expMask: 0b00000001, type: 0b00010010, bias:  0, unit: '', description: 'Reserved' },
    VIF_RES_E00101nn:             { typeMask: 0b01111100, expMask: 0b00000011, type: 0b00010100, bias:  0, unit: '', description: 'Reserved' },
    VIF_MASS_T:                   { typeMask: 0b01111110, expMask: 0b00000001, type: 0b00011000, bias:  2, unit: 't', calcFunc: 'numeric', description: 'Mass' }, //  Mass 10(n+2)t 100t to 1000t
    //E0011010 to E0100000 Reserved
    VIF_VOLUME_CFEET:             { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00100001, bias: -1, unit: 'feet³', calcFunc: 'numeric', description: 'Volume' }, //  Volume 0,1 feet^3
    VIF_VOLUME_GALLON:            { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00100010, bias: -1, unit: 'american gallon', calcFunc: 'numeric', description: 'Volume' }, //  Volume 0,1 american gallon
    VIF_VOLUME_GALLON_L:          { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00100011, bias:  0, unit: 'american gallon', calcFunc: 'numeric', description: 'Volume' }, //  Volume 1 american gallon
    VIF_VOLUME_FLOW_GALLON_L:     { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00100100, bias: -3, unit: 'american gallon/min', calcFunc: 'numeric', description: 'Volume flow' }, //  Volume flow 0,001 american gallon/min
    VIF_VOLUME_FLOW_GALLON:       { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00100101, bias:  0, unit: 'american gallon/min', calcFunc: 'numeric', description: 'Volume flow' }, //  Volume flow 1 american gallon/min
    VIF_VOLUME_FLOW_GALLON_H:     { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00100110, bias:  0, unit: 'american gallon/h', calcFunc: 'numeric', description: 'Volume flow' }, //  Volume flow 1 american gallon/h
    VIF_RES_E0100111:             { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00100111, bias:  0, unit: '', description: 'Reserved' },
    VIF_POWER_MW:                 { typeMask: 0b01111110, expMask: 0b00000001, type: 0b00101000, bias: -1, unit: 'MW', calcFunc: 'numeric', description: 'Power' }, // Power 10(n-1)MW 0.1MW to 1MW
    VIF_RES_E010101n:             { typeMask: 0b01111110, expMask: 0b00000001, type: 0b00101010, bias:  0, unit: '', description: 'Reserved' },
    VIF_RES_E01011nn:             { typeMask: 0b01111100, expMask: 0b00000011, type: 0b00101100, bias:  0, unit: '', description: 'Reserved' },
    VIF_POWER_GJH:                { typeMask: 0b01111110, expMask: 0b00000001, type: 0b00110000, bias: -1, unit: 'GJ/h', calcFunc: 'numeric', description: 'Power' }, // Power 10(n-1)GJ/h 0.1GJ/h to 1GJ/h
    // E0110010 to E1010111 Reserved
    VIF_TEMPERATURE_FLOW_F:       { typeMask: 0b01111100, expMask: 0b00000011, type: 0b01011000, bias: -3, unit: '°F', calcFunc: 'numeric', description: 'Flow Temperature' }, // Flow Temperature 10(nn-3)°F 0.001°F to 1°F
    VIF_TEMPERATURE_RETURN_F:     { typeMask: 0b01111100, expMask: 0b00000011, type: 0b01011100, bias: -3, unit: '°F', calcFunc: 'numeric', description: 'Return Temperature' }, // Return Temperature 10(nn-3)°F 0.001°F to 1°F
    VIF_TEMPERATURE_DIFF_F:       { typeMask: 0b01111100, expMask: 0b00000011, type: 0b01100000, bias: -3, unit: '°F', calcFunc: 'numeric', description: 'Temperature Difference' }, // Temperature Difference 10(nn-3)°F 0.001°F to 1°F
    VIF_TEMPERATURE_EXT_F:        { typeMask: 0b01111100, expMask: 0b00000011, type: 0b01100100, bias: -3, unit: '°F', calcFunc: 'numeric', description: 'External Temperature' }, // External Temperature 10(nn-3)°F 0.001°F to 1°F
    VIF_RES_E1101nnn:             { typeMask: 0b01111000, expMask: 0b00000111, type: 0b01101000, bias:  0, unit: '', description: 'Reserved' },
    VIF_COLD_WARM_LIMIT_C:        { typeMask: 0b01111100, expMask: 0b00000011, type: 0b01110000, bias: -3, unit: '°F', calcFunc: 'numeric', description: 'Cold / Warm Temperature Limit' }, // Cold / Warm Temperature Limit 10(nn-3)°F 0.001°F to 1°F
    VIF_COLD_WARM_LIMIT_F:        { typeMask: 0b01111100, expMask: 0b00000011, type: 0b01110100, bias: -3, unit: '°C', calcFunc: 'numeric', description: 'Cold / Warm Temperature Limit' }, // Cold / Warm Temperature Limit 10(nn-3)°C 0.001°C to 1°C
    VIF_CUMUL_COUNT_MAX_POWER:    { typeMask: 0b01111000, expMask: 0b00000111, type: 0b01111000, bias: -3, unit: 'W', calcFunc: 'numeric', description: 'cumul. count max power' }, // cumul. count max power 10(nnn-3)W 0.001W to 10000W
};

// a) Codes used with extension indicator $FD
const VIFInfo_FD = {
    VIF_CREDIT:                   { typeMask: 0b01111100, expMask: 0b00000011, type: 0b00000000, bias: -3, unit: '€', calcFunc: 'numeric', description: 'Credit' }, // Credit of 10nn-3 of the nominal local legal currency units
    VIF_DEBIT:                    { typeMask: 0b01111100, expMask: 0b00000011, type: 0b00000100, bias: -3, unit: '€', calcFunc: 'numeric', description: 'Debit' }, // Debit of 10nn-3 of the nominal local legal currency units
    VIF_ACCESS_NO:                { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00001000, bias:  0, unit: '',  calcFunc: 'numeric', description: 'Access number (transmission count)' }, // Access number (transmission count)
    VIF_MEDIUM:                   { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00001001, bias:  0, unit: '', description: 'Medium' }, // Medium (as in fixed header)
    VIF_MANUFACTURER:             { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00001010, bias:  0, unit: '', description: 'Manufacturer' }, // Manufacturer (as in fixed header)
    VIF_PARAM_SET_IDENTIFICATION: { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00001011, bias:  0, unit: '', description: 'Parameter set identification' }, // Parameter set identification
    VIF_MODEL_VERSION:            { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00001100, bias:  0, unit: '', description: 'Model / Version' }, // Model / Version
    VIF_HARDWARE_VERSION:         { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00001101, bias:  0, unit: '', description: 'Hardware version #' }, // Hardware version #
    VIF_FIRMWARE_VERSION:         { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00001110, bias:  0, unit: '', description: 'Firmware version #' }, // Firmware version #
    VIF_SOFTWARE_VERSION:         { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00001111, bias:  0, unit: '', description: 'Software version #' }, // Software version #
    VIF_CUSTOMER_LOCATION:        { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00010000, bias:  0, unit: '', description: 'Customer location' }, // Customer Location
    VIF_CUSTOMER:                 { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00010001, bias:  0, unit: '', description: 'Customer' }, // Customer
    VIF_ACCESS_CODE_USER:         { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00010010, bias:  0, unit: '', description: 'Access Code User' }, // Access Code User
    VIF_ACCESS_CODE_OPERATOR:     { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00010011, bias:  0, unit: '', description: 'Access Code Operator' }, // Access Code Operator
    VIF_ACCESS_CODE_SYS_OPERATOR: { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00010100, bias:  0, unit: '', description: 'Access Code Sytem Operator' }, // Access Code System Operator
    VIF_ACCESS_CODE_DEVELOPER:    { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00010101, bias:  0, unit: '', description: 'Access Code Developer' }, // Access Code Developer
    VIF_PASSWORD:                 { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00010110, bias:  0, unit: '', description: 'Password' }, // Password
    VIF_ERROR_FLAGS:              { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00010111, bias:  0, unit: '', calcFunc: 'hex', description: 'Error flags (binary)' }, // Error flags (binary)
    VIF_ERROR_MASK:               { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00011000, bias:  0, unit: '', calcFunc: 'hex', description: 'Error mask' }, // Error mask
    VIF_RES_E0011001:             { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00011001, bias:  0, unit: '', description: 'Reserved' },
    VIF_DIGITAL_OUTPUT_BINARY:    { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00011010, bias:  0, unit: '', description: 'Digital Output (binary)' }, // Digital Output (binary)
    VIF_DIGITAL_INPUT_BINARY:     { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00011011, bias:  0, unit: '', description: 'Digital Input (binary) ' }, // Digital Input (binary)
    VIF_BAUDRATE:                 { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00011100, bias:  0, unit: 'baud', description: 'Baudrate' }, // Baudrate
    VIF_RESPONSE_DELAY_TIME:      { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00011101, bias:  0, unit: 'bittimes', description: 'Response delay time' }, // response delay time [bittimes]
    VIF_RETRY:                    { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00011110, bias:  0, unit: '', description: 'Retry' }, // Retry
    VIF_RES_E0011111:             { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00011111, bias:  0, unit: '', description: 'Reserved' },
    VIF_FIRST_STORAGE_CYCLIC:     { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00100000, bias:  0, unit: '', description: 'First storage # for cyclic storage' }, // First storage # for cyclic storage
    VIF_LAST_STORAGE_CYCLIC:      { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00100001, bias:  0, unit: '', description: 'Last storage # for cyclic storage' }, // Last storage # for cyclic storage
    VIF_SIZE_STORAGE_BLOCK:       { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00100010, bias:  0, unit: '', description: 'Size of storage block' }, // Size of storage block
    VIF_RES_E0100011:             { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00100011, bias:  0, unit: '', description: 'Reserved' },
    VIF_SIZE_STORAGE_INTERVAL_:   { typeMask: 0b01111100, expMask: 0b00000011, type: 0b00100100, bias:  0, unit: '', calcFunc: 'timeperiod', description: 'Storage interval ' }, // Storage interval [sec(s)..day(s)]
    VIF_SIZE_STORAGE_INTERVAL_M:  { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00101000, bias:  0, unit: 'months', description: 'Storage interval' }, // Storage interval month(s)
    VIF_SIZE_STORAGE_INTERVAL_Y:  { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00101001, bias:  0, unit: 'years', description: 'Storage interval' }, // Storage interval year(s)
    VIF_RES_E0101010:             { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01010101, bias:  0, unit: '', description: 'Reserved' },
    VIF_RES_E0101011:             { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00101011, bias:  0, unit: '', description: 'Reserved' },
    VIF_DURATION_SINCE_LAST_READ: { typeMask: 0b01111100, expMask: 0b00000011, type: 0b00101100, bias:  0, unit: '', calcFunc: 'timeperiod', description: 'Duration since last readout' }, // Duration since last readout [sec(s)..day(s)]
    VIF_TARIFF_START:             { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00110000, bias:  0, unit: '', description: 'Start of tariff' }, // Start (date/time) of tariff
    VIF_TARIFF_DURATION_MIN:      { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00110001, bias:  0, unit: 'min', description: 'Duration of tariff' }, // Duration of tariff (nn=01 ..11: min to days)
    VIF_TARIFF_DURATION_HOUR:     { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00110010, bias:  0, unit: 'h', description: 'Duration of tariff' }, // Duration of tariff (nn=01 ..11: min to days)
    VIF_TARIFF_DURATION_DAY:      { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00110011, bias:  0, unit: 'd', description: 'Duration of tariff' }, // Duration of tariff (nn=01 ..11: min to days)
    VIF_TARIFF_PERIOD:            { typeMask: 0b01111100, expMask: 0b00000011, type: 0b00110100, bias:  0, unit: '', calcFunc: 'timeperiod', description: 'Period of tariff' }, // Period of tariff [sec(s) to day(s)]
    VIF_TARIFF_PERIOD_M:          { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00111000, bias:  0, unit: 'months', description: 'Period of tariff' }, // Period of tariff months(s)
    VIF_TARIFF_PERIOD_Y:          { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00111001, bias:  0, unit: 'years',  description: 'Period of tariff' }, // Period of tariff months(s)
    VIF_DIMENSIONLESS:            { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00111010, bias:  0, unit: '', description: 'Dimensionless' }, // dimensionless / no VIF
    VIF_RES_E0111011:             { typeMask: 0b01111111, expMask: 0b00000000, type: 0b00111011, bias:  0, unit: '', description: 'Reserved' },
    VIF_RES_E01111xx:             { typeMask: 0b01111100, expMask: 0b00000011, type: 0b00111100, bias:  0, unit: '', description: 'Reserved' },
    VIF_ELECTRICAL_VOLTAGE:       { typeMask: 0b01110000, expMask: 0b00001111, type: 0b01000000, bias: -9, unit: 'V', calcFunc: 'numeric', description: 'Voltage' }, // 10nnnn-9 Volts
    VIF_ELECTRICAL_CURRENT:       { typeMask: 0b01110000, expMask: 0b00001111, type: 0b01010000, bias:-12, unit: 'A', calcFunc: 'numeric', description: 'Current' }, // 10nnnn-12 Ampere
    VIF_RESET_COUNTER:            { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01100000, bias:  0, unit: '', description: 'Reset counter' },
    VIF_CUMULATION_COUNTER:       { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01100001, bias:  0, unit: '', description: 'Cumulation counter' },
    VIF_CONTROL_SIGNAL:           { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01100010, bias:  0, unit: '', description: 'Control signal' },
    VIF_DAY_OF_WEEK:              { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01100011, bias:  0, unit: '', description: 'Day of week' },
    VIF_WEEK_NUMBER:              { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01100100, bias:  0, unit: '', description: 'Week number' },
    VIF_TIME_POINT_DAY_CHANGE:    { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01100101, bias:  0, unit: '', description: 'Time point of day change' },
    VIF_STATE_OF_PARAM_ACTIVATION:{ typeMask: 0b01111111, expMask: 0b00000000, type: 0b01100110, bias:  0, unit: '', description: 'State of parameter activation' },
    VIF_SPECIAL_SUPPLIER_INFO:    { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01100111, bias:  0, unit: '', description: 'Special supplier information' },
    VIF_DURATION_SINCE_CUMULATION:{ typeMask: 0b01111100, expMask: 0b00000011, type: 0b01101000, bias:  0, unit: '', calcFunc: 'timeperiodPP', description: 'Duration since last cumulation' }, // Duration since last cumulation [hour(s)..years(s)]
    VIF_OPERATING_TIME_BATTERY:   { typeMask: 0b01111100, expMask: 0b00000011, type: 0b01101100, bias:  0, unit: '', calcFunc: 'timeperiodPP', description: 'Operating time battery' }, // Operating time battery [hour(s)..years(s)]
    VIF_DATETIME_BATTERY_CHANGE:  { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01110000, bias:  0, unit: '', description: 'Date and time of battery change' },
    VIF_RECEPTION_LEVEL:          { typeMask: 0b01111111, expMask: 0b00000000, type: 0b01110001, bias:  0, unit: 'dBm', description: 'Reception level' }, // reception level of a received radio device.
    VIF_RES_E111xxxx:             { typeMask: 0b01110000, expMask: 0b00000000, type: 0b01110000, bias:  0, unit: '', description: 'Reserved' } // Reserved
};
function matches(i, vifDescriptor) {
    return (i & vifDescriptor.typeMask) === vifDescriptor.type;
}

function createNew(i, vifDescriptor, name) {
    let bias = vifDescriptor.bias + (i & vifDescriptor.expMask);
    return `    case 0x${i.toString(16)}: return {
        vif: '${name.substring(4)}',
        unit: '${vifDescriptor.unit}',
        description: '${vifDescriptor.description}',
        type: ${vifDescriptor.calcFunc === 'numeric' ? 'TYPE_NUMBER' : 'TODO' },
        calc: ${vifDescriptor.calcFunc !== 'numeric' ? 'TODO' : `val => val ${bias < 0 ? '/' : '*'} ${Math.pow(10, Math.abs(bias))}` }
    };`;
}

function findAndCreateNew(i) {
    for (const k of Object.keys(VIFInfo_FD))
        if (matches(i, VIFInfo_FD[k])) {
            return createNew(i, VIFInfo_FD[k], k);
        }
}

function createAll() {
    let res = '';
    for (let i = 0; i < 128; i++) {
        res += "\n" + findAndCreateNew(i);
    }
    return res;
}

require('fs').writeFileSync('/tmp/test-sync', createAll());

/*
        case 0x06: return {
            unit: 'Wh',
            description: 'Energy',
            calc: val => val * 1000,
            type: TYPE_NUMBER,
            vif: 'VIF_ENERGY_WATT'
          }
          */