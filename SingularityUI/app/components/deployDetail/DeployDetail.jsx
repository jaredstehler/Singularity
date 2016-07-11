import React, { PropTypes } from 'react';
import { connect } from 'react-redux';

import Clipboard from 'clipboard';

import Utils from '../../utils';

import { FetchTaskHistoryForDeploy } from '../../actions/api/history';

import { DeployState, InfoBox } from '../common/statelessComponents';

import Breadcrumbs from '../common/Breadcrumbs';
import JSONButton from '../common/JSONButton';
import SimpleTable from '../common/SimpleTable';
import ServerSideTable from '../common/ServerSideTable';
import CollapsableSection from '../common/CollapsableSection';

import ActiveTasksTable from './ActiveTasksTable';

class DeployDetail extends React.Component {
  static propTypes = {
    deploy: PropTypes.object.isRequired,
    taskHistory: PropTypes.arrayOf(PropTypes.object).isRequired,
    latestHealthchecks: PropTypes.arrayOf(PropTypes.object).isRequired,
    dispatch: PropTypes.func.isRequired
  };

  componentDidMount() {
    new Clipboard('.info-copyable'); // eslint-disable-line no-new
  }

  renderHeader(d) {
    let message;
    if (d.deployResult.message) {
      message = (
        <div className="row">
            <div className="col-md-12">
                <div className="well text-muted">
                    {d.deployResult.message}
                </div>
            </div>
        </div>
      );
    }
    let failures;
    if (d.deployResult.deployFailures) {
      let fails = [];
      let k = 0;
      for (const f of d.deployResult.deployFailures) {
        fails.push(f.taskId ?
          <a key={k} href={`${config.appRoot}/task/${f.taskId.id}`} className="list-group-item">
            <strong>{f.taskId.id}</strong>: {f.reason} (Instance {f.taskId.instanceNo}): {f.message}
          </a>
          :
          <li key={k} className="list-group-item">{f.reason}: {f.message}</li>
        );
        k++;
      }
      if (fails.length) {
        failures = (
          <div className="row">
            <div className="col-md-12">
              <div className="panel panel-danger">
                <div className="panel-heading text-muted">Deploy had {fails.length} failure{fails.length > 1 ? 's' : ''}:</div>
                <div className="panel-body">
                  {fails}
                </div>
              </div>
            </div>
          </div>
        );
      }
    }
    return (
      <header className="detail-header">
        <div className="row">
          <div className="col-md-12">
            <Breadcrumbs
              items={[
                {
                  label: 'Request',
                  text: d.deploy.requestId,
                  link: `${config.appRoot}/request/${d.deploy.requestId}`
                },
                {
                  label: 'Deploy',
                  text: d.deploy.id
                }
              ]}
            />
          </div>
        </div>
        <div className="row">
          <div className="col-md-8">
            <h1>
              <span>{d.deploy.id}</span>
              <DeployState state={d.deployResult.deployState} />
            </h1>
          </div>
          <div className="col-md-4 button-container">
            <JSONButton object={d} linkClassName="btn btn-default">
              JSON
            </JSONButton>
          </div>
        </div>
        {failures || message}
      </header>
    );
  }

  renderActiveTasks(d) {
    return (
      <div>
        <div className="page-header">
          <h2>Active Tasks</h2>
        </div>
        <ActiveTasksTable deployId={d.id} />
      </div>
    );
  }

  renderTaskHistory(d, tasks) {
    return (
      <div>
        <div className="page-header">
          <h2>Task History</h2>
        </div>
        <ServerSideTable
          emptyMessage="No tasks"
          entries={tasks}
          paginate={tasks.length >= 5}
          perPage={5}
          fetchAction={FetchTaskHistoryForDeploy}
          dispatch={this.props.dispatch}
          fetchParams={[d.deploy.requestId, d.deploy.id]}
          headers={['Name', 'Last State', 'Started', 'Updated', '', '']}
          renderTableRow={(data, index) => {
            return (
              <tr key={index}>
                <td><a href={`${config.appRoot}/task/${data.taskId.id}`}>{data.taskId.id}</a></td>
                <td><span className={`label label-${Utils.getLabelClassFromTaskState(data.lastTaskState)}`}>{Utils.humanizeText(data.lastTaskState)}</span></td>
                <td>{Utils.timestampFromNow(data.taskId.startedAt)}</td>
                <td>{Utils.timestampFromNow(data.updatedAt)}</td>
                <td className="actions-column"><a href={`${config.appRoot}/request/${data.taskId.requestId}/tail/${config.finishedTaskLogPath}?taskIds=${data.taskId.id}`} title="Log">&middot;&middot;&middot;</a></td>
                <td className="actions-column"><JSONButton object={data}>{'{ }'}</JSONButton></td>
              </tr>
            );
          }}
        />
    </div>
    );
  }

  renderInfo(d) {
    let stats = [];

    if (d.deployMarker.timestamp) {
      stats.push(<InfoBox key="initiated" copyableClassName="info-copyable" name="Initiated" value={Utils.timestampFromNow(d.deployMarker.timestamp)} />);
    }
    if (d.deployResult.timestamp) {
      stats.push(<InfoBox key="completed" copyableClassName="info-copyable" name="Completed" value={Utils.timestampFromNow(d.deployResult.timestamp)} />);
    }
    if (d.deploy.executorData && d.deploy.executorData.cmd) {
      stats.push(<InfoBox key="cmd" copyableClassName="info-copyable" name="Command" value={d.deploy.executorData.cmd} />);
    }
    if (d.deploy.resources.cpus) {
      let value = `CPUs: ${d.deploy.resources.cpus} | Memory (Mb): ${d.deploy.resources.memoryMb} | Ports: ${d.deploy.resources.numPorts}`;
      stats.push(<InfoBox key="cpus" copyableClassName="info-copyable" name="Resources" value={value} />);
    }
    if (d.deploy.executorData && d.deploy.executorData.extraCmdLineArgs) {
      stats.push(<InfoBox key="args" copyableClassName="info-copyable" name="Extra Command Line Arguments" value={d.deploy.executorData.extraCmdLineArgsd} />);
    }

    for (let s in d.deployStatistics) {
      if (typeof d.deployStatistics[s] !== 'object') {
        let value = typeof d.deployStatistics[s] === 'string' ? Utils.humanizeText(d.deployStatistics[s]) : d.deployStatistics[s];
        stats.push(
          <InfoBox copyableClassName="info-copyable" key={s} name={Utils.humanizeCamelcase(s)} value={value} />
        );
      }
    }
    return (
      <CollapsableSection title="Info" defaultExpanded={true}>
        <div className="row">
          <ul className="list-unstyled horizontal-description-list">
            {stats}
          </ul>
        </div>
      </CollapsableSection>
    );
  }

  renderHealthchecks(d, healthchecks) {
    if (healthchecks.length === 0) return <div></div>;
    return (
      <CollapsableSection title="Latest Healthchecks">
        <SimpleTable
          emptyMessage="No healthchecks"
          entries={_.values(healthchecks)}
          perPage={5}
          first={true}
          last={true}
          headers={['Task', 'Timestamp', 'Duration', 'Status', 'Message', '']}
          renderTableRow={(data, index) => {
            return (
              <tr key={index}>
                <td><a href={`${config.appRoot}/task/${data.taskId.id}`}>{data.taskId.id}</a></td>
                <td>{Utils.absoluteTimestamp(data.timestamp)}</td>
                <td>{data.durationMillis} {data.durationMillis ? 'ms' : ''}</td>
                <td>{data.statusCode ? <span className={`label label-${data.statusCode === 200 ? 'success' : 'danger'}`}>HTTP {data.statusCode}</span> : <span className="label label-warning">No Response</span>}</td>
                <td><pre className="healthcheck-message">{data.errorMessage || data.responseBody}</pre></td>
                <td className="actions-column"><JSONButton object={data}>{'{ }'}</JSONButton></td>
              </tr>
            );
          }}
        />
      </CollapsableSection>
    );
  }

  render() {
    const { deploy, activeTasks, taskHistory, latestHealthchecks } = this.props;
    return (
      <div>
        {this.renderHeader(deploy)}
        {this.renderActiveTasks(deploy, activeTasks)}
        {this.renderTaskHistory(deploy, taskHistory)}
        {this.renderInfo(deploy)}
        {this.renderHealthchecks(deploy, latestHealthchecks)}
      </div>
    );
  }
}

function mapStateToProps(state) {
  let latestHealthchecks = _.mapObject(state.api.task, (val, key) => {
    if (val.data && val.data.healthcheckResults && val.data.healthcheckResults.length > 0) {
      return _.max(val.data.healthcheckResults, (hc) => {
        return hc.timestamp;
      });
    }
    return undefined;
  });
  latestHealthchecks = _.without(latestHealthchecks, undefined);

  return {
    deploy: state.api.deploy.data,
    taskHistory: state.api.taskHistoryForDeploy.data,
    latestHealthchecks
  };
}

export default connect(mapStateToProps)(DeployDetail);
