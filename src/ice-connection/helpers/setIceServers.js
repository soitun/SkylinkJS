import { TAGS, TURN_TRANSPORT } from '../../constants';
import Skylink from '../../index';
import logger from '../../logger';
import MESSAGES from '../../messages';
import { isEmptyArray } from '../../utils/helpers';

const defaultIceServerPorts = {
  udp: [3478, 53],
  tcp: [80, 3478],
  ssl: [443, 5349],
};

const CONSTANTS = {
  STUN: 'stun',
  TURN: 'turn',
  TURNS: 'turns',
  TCP: 'TCP',
  UDP: 'UDP',
};

const getServers = (protocol, servers) => {
  const _servers = servers.filter((s) => {
    const parts = s.url.split(':');
    const iceServerProtocol = parts[0];
    return iceServerProtocol === protocol;
  }).map((s) => {
    const parts = s.url.split(':');
    const urlParts = (parts[1] || '').split('@');

    const iceServerProtocol = parts[0];
    const iceServerName = (urlParts[1] || urlParts[0]).split('?')[0];
    const username = urlParts.length === 2 ? urlParts[0] : '';
    const credential = s.credential || '';

    return { credential, iceServerName, username, iceServerProtocol };
  });

  return _servers;
};

/**
 * @param {String} roomKey - The room id
 * @param {RTCIceServer[]} servers - The list of IceServers passed | {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCIceServer}
 * @memberOf IceConnectionHelpers
 * @private
 * @return {filteredIceServers}
 */
const setIceServers = (roomKey, servers) => {
  const initOptions = Skylink.getInitOptions();
  const state = Skylink.getSkylinkState(roomKey);

  const {
    forceTURN,
    forceTURNSSL,
    TURNServerTransport,
  } = initOptions;

  const stunServers = getServers(CONSTANTS.STUN, servers);
  const turnServers = getServers(CONSTANTS.TURN, servers);
  const turnsServers = getServers(CONSTANTS.TURNS, servers);

  const iceServers = [];

  if (!forceTURN && !forceTURNSSL) {
    stunServers.forEach((s) => {
      const urls = [];
      defaultIceServerPorts.udp.forEach((portNo) => {
        urls.push(`${s.iceServerProtocol}:${s.iceServerName}:${portNo}`);
      });
      iceServers.push({ urls, credential: s.credential, username: s.username });
    });
  }

  if (!forceTURNSSL) {
    turnServers.forEach((s) => {
      const urls = [];
      if (TURNServerTransport !== TURN_TRANSPORT.TCP) {
        defaultIceServerPorts.udp.forEach((portNo) => {
          urls.push(`${s.iceServerProtocol}:${s.iceServerName}:${portNo}`);
          if (TURNServerTransport !== TURN_TRANSPORT.NONE) {
            urls.push(`${s.iceServerProtocol}:${s.iceServerName}:${portNo}?transport=udp`);
          }
        });
      }

      if (TURNServerTransport !== TURN_TRANSPORT.UDP) {
        defaultIceServerPorts.tcp.forEach((portNo) => {
          if (urls.indexOf(`${s.iceServerProtocol}:${s.iceServerName}:${portNo}`) === -1) {
            urls.push(`${s.iceServerProtocol}:${s.iceServerName}:${portNo}`);
          }

          if (TURNServerTransport !== TURN_TRANSPORT.NONE) {
            urls.push(`${s.iceServerProtocol}:${s.iceServerName}:${portNo}?transport=tcp`);
          }
        });
      }

      iceServers.push({ urls, credential: s.credential, username: s.username });
    });
  }

  if (TURNServerTransport !== TURN_TRANSPORT.NONE && TURNServerTransport !== TURN_TRANSPORT.UDP) {
    turnsServers.forEach((s) => {
      const urls = [];
      defaultIceServerPorts.ssl.forEach((portNo) => {
        urls.push(`${s.iceServerProtocol}:${s.iceServerName}:${portNo}?transport=tcp`);
      });

      iceServers.push({ urls, credential: s.credential, username: s.username });
    });
  }

  if (isEmptyArray(iceServers) && initOptions.forceTURN && !state.hasMCU) {
    logger.log.WARN([null, TAGS.PEER_CONNECTION, null, MESSAGES.ICE_CONNECTION.TURN_NOT_ENABLED]);
  } else if (isEmptyArray(iceServers)) {
    logger.log.WARN([null, TAGS.PEER_CONNECTION, null, MESSAGES.ICE_CONNECTION.NO_ICE_SERVERS]);
  }

  return {
    iceServers,
  };
};

export default setIceServers;
