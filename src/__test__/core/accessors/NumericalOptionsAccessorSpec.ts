import {
  NumericOptionsAccessor, ImmutableQuery, Searcher,
  BoolMust, BoolShould, ValueState, RangeQuery,
  RangeBucket, FilterBucket
} from "../../../"
import * as _ from "lodash"

describe("NumericOptionsAccessor", ()=> {

  beforeEach(()=> {
    this.searcher = new Searcher(null)
    this.options = {
      field:"price",
      id:"price_id",
      title:"”Price",
      options:[
        {title:"Cheap", from:1, to:11},
        {title:"Affordable", from:11, to:21},
        {title:"Pricey", from:21, to:101}
      ]
    }
    this.accessor = new NumericOptionsAccessor("categories", this.options)
    this.accessor.uuid = "9999"
    this.accessor.setSearcher(this.searcher)
    this.query = new ImmutableQuery()
    this.toPlainObject = (ob)=> {
      return JSON.parse(JSON.stringify(ob))
    }
  })

  it("constructor()", ()=> {
    expect(this.accessor.key).toBe("categories")
    expect(this.accessor.options).toBe(this.options)
  })

  it("getBuckets()", ()=> {
    this.searcher.results = {
      aggregations:{
        categories:{
          categories:{
            buckets:[1,2,3,4]
          }
        }
      }
    }
    expect(this.accessor.getBuckets())
      .toEqual([1,2,3,4])
  })
  it("getRanges()", ()=> {
    expect(this.accessor.getRanges()).toEqual([
      {key: 'Cheap', from: 1, to: 11},
      {key: 'Affordable', from: 11, to: 21},
      {key: 'Pricey', from: 21, to: 101}
    ])
  })

  it("buildSharedQuery()", ()=> {
    this.accessor.state = new ValueState("Affordable")
    let query = this.accessor.buildSharedQuery(this.query)
    let expected = BoolMust([
      BoolMust([
        RangeQuery("price", 11, 21)
      ])
    ])
    expect(query.query.filter).toEqual(expected)
    expect(_.keys(query.index.filtersMap))
      .toEqual(["9999"])

    let selectedFilters = query.getSelectedFilters()
    expect(selectedFilters.length).toEqual(1)
    expect(this.toPlainObject(selectedFilters[0])).toEqual({
      name: '”Price', value: 'Affordable', id: 'price_id',
    })
    expect(this.accessor.state.getValue()).toEqual("Affordable")
    selectedFilters[0].remove()
    expect(this.accessor.state.getValue()).toEqual(null)
  })


  it("buildOwnQuery()", ()=> {
    this.query = this.query.addFilter("other", BoolShould(["foo"]))
    let query = this.accessor.buildSharedQuery(this.query)
    query = this.accessor.buildOwnQuery(query)
    expect(query.query.aggs).toEqual(
      FilterBucket(
        "categories",
        BoolMust([BoolShould(["foo"])]),
        RangeBucket(
          "categories",
          "price",
          [
            {
              "key": "Cheap",
              "from": 1,
              "to": 11
            },
            {
              "key": "Affordable",
              "from": 11,
              "to": 21
            },
            {
              "key": "Pricey",
              "from": 21,
              "to": 101
            }
          ]
        )
      )
    )

  })

})
