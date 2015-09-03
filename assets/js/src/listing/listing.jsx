define(
  'listing',
  [
    'mailpoet',
    'jquery',
    'react',
    'classnames',
    'listing/bulk_actions.jsx',
    'listing/header.jsx',
    'listing/pages.jsx',
    'listing/search.jsx',
    'listing/groups.jsx',
    'listing/filters.jsx'
  ],
  function(
    MailPoet,
    jQuery,
    React,
    classNames,
    ListingBulkActions,
    ListingHeader,
    ListingPages,
    ListingSearch,
    ListingGroups,
    ListingFilters
  ) {
     var ListingItem = React.createClass({
      handleSelect: function(e) {
        var is_checked = jQuery(e.target).is(':checked');

        this.props.onSelect(
          parseInt(e.target.value, 10),
          is_checked
        );

        return !e.target.checked;
      },
      render: function() {
        return (
          <tr>
            <th className="check-column" scope="row">
              <label className="screen-reader-text">
                { 'Select ' + this.props.item.email }</label>
              <input
                type="checkbox"
                defaultValue={ this.props.item.id }
                defaultChecked={ this.props.item.selected }
                onChange={ this.handleSelect } />
            </th>
            { this.props.onRenderItem(this.props.item) }
          </tr>
        );
      }
    });


    var ListingItems = React.createClass({
      render: function() {
        if(this.props.items.length === 0) {
          return (
            <tbody>
              <tr className="no-items">
                <td
                  colSpan={ this.props.columns.length + 1 }
                  className="colspanchange">
                  {
                    (this.props.loading === true)
                    ? MailPoetI18n.loading
                    : MailPoetI18n.noRecordFound
                  }
                </td>
              </tr>
            </tbody>
          );
        } else {
          return (
            <tbody>
              {this.props.items.map(function(item) {
                item.selected = (this.props.selected.indexOf(item.id) !== -1);
                return (
                  <ListingItem
                    columns={ this.props.columns }
                    onSelect={ this.props.onSelect }
                    onRenderItem={ this.props.onRenderItem }
                    key={ 'item-' + item.id }
                    item={ item } />
                );
              }.bind(this))}
            </tbody>
          );
        }
      }
    });

    var Listing = React.createClass({
      getInitialState: function() {
        return {
          loading: false,
          search: '',
          page: 1,
          count: 0,
          limit: 10,
          sort_by: 'id',
          sort_order: 'desc',
          items: [],
          groups: [],
          group: 'all',
          filters: [],
          selected: []
        };
      },
      componentDidMount: function() {
        this.getItems();
      },
      getItems: function() {
        this.setState({ loading: true });
        this.props.items.bind(null, this)();
      },
      handleSearch: function(search) {
        this.setState({
          search: search
        }, function() {
          this.getItems();
        }.bind(this));
      },
      handleSort: function(sort_by, sort_order = 'asc') {
        this.setState({
          sort_by: sort_by,
          sort_order: sort_order
        }, function() {
          this.getItems();
        }.bind(this));
      },
      handleSelect: function(id, is_checked) {
        var selected = this.state.selected;

        if(is_checked) {
          selected = jQuery.merge(selected, [ id ]);
        } else {
          selected.splice(selected.indexOf(id), 1);
        }
        this.setState({
          selected: selected
        });
      },
      handleGroup: function(group) {
        // reset search
        jQuery('#search_input').val('');

        this.setState({
          group: group,
          filters: [],
          selected: [],
          search: '',
          page: 1
        }, function() {
          this.getItems();
        }.bind(this));
      },
      handleSelectAll: function(is_checked) {
        if(is_checked === false) {
          this.setState({ selected: [] });
        } else {
          var selected = this.state.items.map(function(item) {
            return ~~item.id;
          });

          this.setState({
            selected: selected
          });
        }
      },
      handleSetPage: function(page) {
        this.setState({ page: page }, function() {
          this.getItems();
        }.bind(this));
      },
      handleRenderItem: function(item) {
        return this.props.onRenderItem(item);
      },
      render: function() {
        var items = this.state.items,
            sort_by =  this.state.sort_by,
            sort_order =  this.state.sort_order;

        // set sortable columns
        columns = this.props.columns.map(function(column) {
          column.sorted = (column.name === sort_by) ? sort_order : false;
          return column;
        });

        var tableClasses = classNames(
          'wp-list-table',
          'widefat',
          'fixed',
          'striped',
          { 'mailpoet_listing_loading': this.state.loading }
        );
        return (
          <div>
            <ListingGroups
              groups={ this.state.groups }
              selected={ this.state.group }
              onSelect={ this.handleGroup } />
            <ListingSearch
              onSearch={ this.handleSearch }
              search={ this.state.search } />
            <div className="tablenav top clearfix">
              <ListingBulkActions
                actions={ this.props.actions }
                selected={ this.state.selected } />
              <ListingFilters filters={ this.state.filters } />
              <ListingPages
                count={ this.state.count }
                page={ this.state.page }
                limit={ this.state.limit }
                onSetPage={ this.handleSetPage } />
            </div>
            <table className={ tableClasses }>
              <thead>
                <ListingHeader
                  onSort={ this.handleSort }
                  onSelectAll={ this.handleSelectAll }
                  sort_by={ this.state.sort_by }
                  sort_order={ this.state.sort_order }
                  columns={ this.props.columns } />
              </thead>

              <ListingItems
                onRenderItem={ this.handleRenderItem }
                columns={ this.props.columns }
                selected={ this.state.selected }
                onSelect={ this.handleSelect }
                loading= { this.state.loading }
                items={ items } />

              <tfoot>
                <ListingHeader
                  onSort={ this.handleSort }
                  onSelectAll={ this.handleSelectAll }
                  sort_by={ this.state.sort_by }
                  sort_order={ this.state.sort_order }
                  columns={ this.props.columns } />
              </tfoot>

            </table>
            <div className="tablenav bottom">
              <ListingBulkActions
                actions={ this.props.actions }
                selected={ this.state.selected } />
              <ListingPages
                count={ this.state.count }
                page={ this.state.page }
                limit={ this.state.limit }
                onSetPage={ this.handleSetPage } />
            </div>
          </div>
        );
      }
    });

    return Listing;
  }
);
