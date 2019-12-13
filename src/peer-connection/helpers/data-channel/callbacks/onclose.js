import logger from '../../../../logger';
import { dispatchEvent } from '../../../../utils/skylinkEventManager';
import { dataTransferState, onDataChannelStateChanged } from '../../../../skylink-events';
import {
  DATA_CHANNEL_STATE, DATA_CHANNEL_TYPE, PEER_CONNECTION_STATE, HANDSHAKE_PROGRESS,
} from '../../../../constants';
import Skylink from '../../../../index';
import messages from '../../../../messages';
import HandleDataChannelStats from '../../../../skylink-stats/handleDataChannelStats';
import PeerConnection from '../../../index';

const getTransferIDByPeerId = (pid, state) => {
  const { dataTransfers } = state;
  const transferIds = Object.keys(dataTransfers);

  for (let i = 0; i < transferIds.length; i += 1) {
    if (transferIds[i].indexOf(pid) !== -1) {
      return transferIds[i];
    }
  }
  return null;
};

/**
 * @param {Object} params
 * @fires onDataChannelStateChanged
 * @fires dataTransferState
 * @memberof PeerConnection.PeerConnectionHelpers.CreateDataChannelCallbacks
 */
const onclose = (params) => {
  const {
    dataChannel,
    peerId,
    channelName,
    channelProp,
    channelType,
    roomState,
  } = params;
  const { DATA_CHANNEL, STATS_MODULE } = messages;
  const state = Skylink.getSkylinkState(roomState.room.id) || Object.values(Skylink.getSkylinkState())[0]; // to handle leaveAllRooms method

  if (!state) {
    return;
  }

  const { room, peerConnections } = state;
  const transferId = getTransferIDByPeerId(peerId, state);
  const handleDataChannelStats = new HandleDataChannelStats();

  logger.log.DEBUG([peerId, 'RTCDataChannel', channelProp, DATA_CHANNEL.closed]);

  try {
    handleDataChannelStats.send(room.id, STATS_MODULE.HANDLE_DATA_CHANNEL_STATS.closed, peerId, dataChannel, channelProp);
    dispatchEvent(onDataChannelStateChanged({
      state: DATA_CHANNEL_STATE.CLOSED,
      peerId,
      room,
      channelName,
      channelType,
      bufferAmount: PeerConnection.getDataChannelBuffer(dataChannel),
    }));

    // ESS-983 Handling dataChannel unexpected close to trigger dataTransferState Error.
    if (transferId) {
      dispatchEvent(dataTransferState({
        state: DATA_CHANNEL_STATE.ERROR,
        transferId,
        peerId,
        transferInfo: null, // TODO: implement self._getTransferInfo(transferId, peerId, true, false, false) data-transfer
        error: new Error(DATA_CHANNEL.closed),
      }));
    }

    if (peerConnections[peerId] && peerConnections[peerId].remoteDescription
      && peerConnections[peerId].remoteDescription.sdp && (peerConnections[peerId].remoteDescription.sdp.indexOf(
      'm=application',
    ) === -1 || peerConnections[peerId].remoteDescription.sdp.indexOf('m=application 0') > 0)) {
      return;
    }

    if (channelType === DATA_CHANNEL_TYPE.MESSAGING) {
      setTimeout(() => {
        if (peerConnections[peerId]
          && peerConnections[peerId].signalingState !== PEER_CONNECTION_STATE.CLOSED
          && (peerConnections[peerId].localDescription
            && peerConnections[peerId].localDescription.type === HANDSHAKE_PROGRESS.OFFER)) {
          logger.log.DEBUG([peerId, 'RTCDataChannel', channelProp, DATA_CHANNEL.reviving_dataChannel]);

          PeerConnection.createDataChannel({
            peerId,
            dataChannel,
            bufferThreshold: PeerConnection.getDataChannelBuffer(dataChannel),
            createAsMessagingChannel: true,
            roomState: state,
          });
          handleDataChannelStats.send(STATS_MODULE.HANDLE_DATA_CHANNEL_STATS.reconnecting, peerId, { label: channelName }, 'main');
        }
      }, 100);
    }
  } catch (error) {
    logger.log.WARN([peerId, 'RTCDataChannel', channelProp, DATA_CHANNEL.closed]);
  }
};

export default onclose;
