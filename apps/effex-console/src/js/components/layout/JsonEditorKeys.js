import React from "react";
import XCard from '../XCard';
import TextField from 'material-ui/TextField';
import XSelect from '../XSelect';
import AccountSelection from './AccountSelection';
export default class  extends React.Component {
 
  constructor (props) {
    super();
    this.state = {
      accountId:""
    };
  }
  
  componentWillReceiveProps = (props) => {
  
    const data = props.accounts.pageResults.bosses.data ;
    const keys = data && data.keys;
    const defaultKey = keys && keys[0];


    // we'll track account id - if it changes, then we can make a new default boss
    if (defaultKey && data.accountId !== this.state.accountId) {
      this.setState ({
        accountId:data.accountId
      }, function () {
          props.changeKey({
            type:'boss',
            value:defaultKey
          });
      });
    }
   
  }

  render() {
    
    const props = this.props;
    const itemStyle = {
      display:'inline-block',
      marginRight:8
    };
    const options = (props.accounts.pageResults.bosses.data ? props.accounts.pageResults.bosses.data.keys : []) || [] ;
    const bossValue = props.jsonKeys.boss;
    const pr = props.pageResults;
    
    const xcs =  <XCard 
      initiallyExpanded = {true}
      title = {props.title}
      subtitle ={props.subtitle}
      content = { 
        <span> 
          <div>
            <TextField
              floatingLabelText={`Writer key to create items`}
              value = {props.jsonKeys.writer}
              disabled = {false}
              onChange = {(event)=>props.changeKey({
                type:'writer',
                value:event.target.value
              })}
              multiLine = {false}
            />
          </div>
            
          <div>
            <TextField
              floatingLabelText={`Reader key(s)`}
              value = {props.jsonKeys.reader}
              disabled = {false}
              onChange = {(event)=>props.changeKey({
                type:'reader',
                value:event.target.value
              })}
              multiLine = {true}
            />

            <TextField
              floatingLabelText={`updater key(s)`}
              value = {props.jsonKeys.updater}
              disabled = {false}
              onChange = {(event)=>props.changeKey({
                type:'updater',
                value:event.target.value
              })}
              multiLine = {true}
            />
          </div>
          
          <div>
         
            <TextField
              floatingLabelText={`Item id`}
              value = {props.jsonKeys.item}
              disabled = {false}
              onChange = {(event)=>props.changeKey({
                type:'item',
                value:event.target.value
              })}
              multiLine = {false}
            />

            <TextField
              floatingLabelText={`Alias to read or assign`}
              value = {props.jsonKeys.alias}
              disabled = {false}
              onChange = {(event)=>props.changeKey({
                type:'alias',
                value:event.target.value
              })}
              multiLine = {false}
            />
          </div>
          
          <AccountSelection 
            accounts={props.accounts} 
            label={"Account to use for key generation"}
            dispatch={props.dispatch}
            stats={props.stats}
            onChange = {(value) => {
             
             props.changeKey({
               type:'account',
               value:value
             });
             

            }}
          />

          <XSelect 
            accounts={props.accounts} 
            label={"Boss to use for key generation"}
            onChange = {(value) => props.changeKey({
                type:'boss',
                value:value
              })}
            value = {bossValue}
            style={itemStyle}
            options = {options}
          />
            
        </span>
      }
      cardActions = {[{
          name:'generate',
          action:props.generateKeys,
          primary:true,
          disabled: (!props.jsonKeys.boss) || (pr&&pr.active)
        }]}

      />;

        
    return <span>{xcs}</span>;


  }
}
 