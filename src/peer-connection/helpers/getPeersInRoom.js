import { getRoomStateByName } from '../../utils/helpers';
import PeerData from '../../peer-data';

/**
 * @param {string} roomName
 * @return {Object|null}
 * @memberOf PeerConnection.PeerConnectionHelpers
 * @private
 */
const getPeersInRoom = (roomName) => {
  const roomState = getRoomStateByName(roomName);
  if (roomState) {
    const listOfPeersInfo = {};
    const listOfPeers = Object.keys(roomState.peerInformations);

    for (let i = 0; i < listOfPeers.length; i += 1) {
      listOfPeersInfo[listOfPeers[i]] = Object.assign({}, PeerData.getPeerInfo(listOfPeers[i], roomState));
      listOfPeersInfo[listOfPeers[i]].isSelf = false;
    }

    if (roomState.user && roomState.user.sid) {
      listOfPeersInfo[roomState.user.sid] = Object.assign({}, PeerData.getCurrentSessionInfo(roomState.room));
      listOfPeersInfo[roomState.user.sid].isSelf = true;
    }
    return listOfPeersInfo;
  }
  return null;
};

export default getPeersInRoom;
