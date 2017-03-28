import React from "react";

import {
  acRangeFinish,
  acRangeStart,
  acRangePeriod,
  acAccountsSelectedRows,
  acFetchBosses,
  dispatchStats 
}
from '../../actions/index';
import AccountSelection from './AccountSelection';
import moment from 'moment';
import XSelect from '../XSelect';
import DatePicker from 'material-ui/DatePicker';

export default class extends React.Component {


 
  
  render() {
    
    const props = this.props;

    // we'll use the selected account later
    const place = props.accounts.pageResults.accounts;
    const selectedAccount = place.selectedItems ? place.selectedItems[0] : "";

    const itemStyle = {
      display:'inline-block',
      marginRight:8
    };
    const dropperJsx = <AccountSelection 
      accounts={props.accounts} 
      label={"API usage for account"}
      dispatch={props.dispatch}
      stats={props.stats} />;

    
    const minDate = new Date(new Date(2017,1,1));
    const maxDate = new Date();
    
    const startJsx = <DatePicker
      floatingLabelText="Start date"
        autoOk={true}
        minDate={minDate}
        maxDate={maxDate}
        container="inline"
        style={itemStyle}
        value={this.props.stats.ranges.start}
        onChange={(e,value) => {
        
          this.props.dispatch  (acRangeStart(selectedAccount,moment(value).startOf('day').toDate(),this.props.stats.ranges.finish)); 
          
        }}
        formatDate={(d)=>moment(d).format("ll")}
        mode={"landscape"}
      />;
    
    const finishJsx = <DatePicker
      floatingLabelText="Finish date"
        autoOk={true}
        minDate={this.props.stats.ranges.start}
        maxDate={maxDate}
        container="inline"
        style={itemStyle}
        value={this.props.stats.ranges.finish}
        onChange={(e,value) => {
          this.props.dispatch  (acRangeFinish(selectedAccount,this.props.stats.ranges.start,moment(value).endOf('day').toDate()));
        }}
        formatDate={(d)=>moment(d).format("ll")}
        mode={"landscape"}
      />;
    
      const periodJsx = <XSelect 
        label="Measurement period" 
        style={itemStyle}
        value ={this.props.stats.ranges.period}
        onChange={(value) => {
          this.props.dispatch(acRangePeriod(value));
        }}
        options = {["hour","day","week","month"]}
      />;
      
    // now render  .. this calls a generalized version so there are quite a few props
    return  ( 
      <span>
        {dropperJsx}
        {startJsx}
        {finishJsx}
        {periodJsx}
    </span>);
  }
}