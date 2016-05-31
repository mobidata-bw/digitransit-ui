import React from 'react';
import config from '../../config';

const isBrowser = typeof window !== 'undefined' && window !== null;

const Popup = () => {
  if (isBrowser) {
    return require('./dynamic-popup'); // eslint-disable global-require
  }
};

import SearchActions from '../../action/SearchActions';
import intl from 'react-intl';
import Icon from '../icon/icon';

class OriginPopup extends React.Component {
  static contextTypes = {
    getStore: React.PropTypes.func.isRequired,
    executeAction: React.PropTypes.func.isRequired,
    intl: intl.intlShape.isRequired,
  };

  static propTypes = {
    shouldOpen: React.PropTypes.bool,
    popupContainer: React.PropTypes.object.isRequired,
    layerContainer: React.PropTypes.object.isRequired,
    yOffset: React.PropTypes.number.isRequired,
    text: React.PropTypes.string.isRequired,
    header: React.PropTypes.object.isRequired,
    map: React.PropTypes.object.isRequired,
  };

  constructor(args) {
    super(...args);
    this.componentDidMount = this.componentDidMount.bind(this);
    this.display = this.display.bind(this);
    this.render = this.render.bind(this);
  }

  componentDidMount() {
    return this.props.shouldOpen && setImmediate(this.display);
  }

  display() {
    return this.props.popupContainer.openPopup();
  }

  render() {
    return (
      <Popup
        context={this.context}
        ref="popup"
        map={this.props.map}
        layerContainer={this.props.layerContainer}
        popupContainer={this.props.popupContainer}
        offset={[50, this.props.yOffset]}
        closeButton={false}
        maxWidth={config.map.genericMarker.popup.maxWidth}
        autoPan={false}
        className="origin-popup"
      >
        <div onClick={() => this.context.executeAction(SearchActions.openDialog, 'origin')}>
          <div className="origin-popup">
            {this.props.header}
            <Icon className="right-arrow" img="icon-icon_arrow-collapse--right" />
          </div>
          <div>
            <div className="origin-popup-name">{this.props.text}</div>
            <div className="shade-to-white" /></div>
        </div>
      </Popup>
    );
  }
}

export default OriginPopup;
