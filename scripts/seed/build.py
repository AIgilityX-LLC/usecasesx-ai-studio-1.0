import sys, re, json
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data import IND

# Valid taxonomy slugs (from DB)
CAPS={"anomaly-detection","automl","computer-vision","conversational-ai","decision-intelligence","edge-ai","generative-ai","knowledge-graphs","llm-agents","multimodal-ai","nlp","ocr-document-ai","predictive-analytics","process-mining-ai","rag","recommender-systems","reinforcement-learning","speech-ai","synthetic-data","time-series-forecasting"}
FUNCS={"clinical-operations","customer-service","data-and-analytics","field-operations","finance","human-resources","it-and-security","legal","logistics","maintenance","marketing-and-sales","operations","procurement","product-management","public-services","quality-assurance","research-and-development","risk-and-compliance","strategy-and-planning","supply-chain"}
OBJS={"citizen-services","cost-reduction","customer-experience","cybersecurity","data-monetization","decision-support","fraud-prevention","innovation","operational-efficiency","personalization","quality-improvement","regulatory-reporting","revenue-growth","risk-and-compliance","sustainability","time-to-market","workforce-productivity"}
MATS={"concept","prototype","pilot","production","scaled"}
RATINGS={"Low","Medium","High","Critical"}
TTVS={"Short","Medium","Long"}

CAP_NAME={"anomaly-detection":"anomaly detection","computer-vision":"computer vision","conversational-ai":"conversational AI","decision-intelligence":"decision intelligence","generative-ai":"generative AI","knowledge-graphs":"knowledge graphs","llm-agents":"LLM agents","nlp":"natural language processing","ocr-document-ai":"document AI","predictive-analytics":"predictive analytics","rag":"retrieval-augmented generation","recommender-systems":"recommender systems","reinforcement-learning":"reinforcement learning","speech-ai":"speech AI","synthetic-data":"synthetic data","time-series-forecasting":"time-series forecasting"}

OBJ_KPI={
 "fraud-prevention":["Fraud loss reduction (%)","False-positive rate","Detection latency"],
 "operational-efficiency":["Cycle-time reduction (%)","Cost per transaction","Throughput uplift"],
 "cost-reduction":["Operating cost reduction (%)","Downtime hours avoided","Resource utilisation"],
 "revenue-growth":["Revenue uplift (%)","Conversion rate","Average order/transaction value"],
 "customer-experience":["CSAT / NPS","First-contact resolution","Average handling time"],
 "personalization":["Engagement rate","Conversion uplift (%)","Repeat-purchase rate"],
 "quality-improvement":["Defect / error rate","Rework reduction (%)","Outcome quality score"],
 "decision-support":["Decision cycle time","Forecast accuracy (%)","Analyst productivity"],
 "citizen-services":["Service resolution time","Citizen satisfaction","Self-service rate"],
 "regulatory-reporting":["Reporting cycle time","Compliance exceptions","Audit findings"],
 "risk-and-compliance":["Risk detection rate","Alert precision","Compliance coverage"],
 "workforce-productivity":["Hours saved per FTE","Task automation rate","Employee satisfaction"],
 "sustainability":["Energy / emissions reduction (%)","Waste reduction (%)","Resource efficiency"],
 "innovation":["Time-to-prototype","Ideas operationalised","R&D cycle time"],
 "time-to-market":["Content / release cycle time","Throughput uplift","Time saved (%)"],
 "decision-support2":[],
}
OBJ_ROI={
 "fraud-prevention":["Reduced fraud losses","Lower investigation cost","Fewer false positives"],
 "operational-efficiency":["Lower operating cost","Higher throughput","Reduced cycle time"],
 "cost-reduction":["Reduced maintenance cost","Avoided downtime","Lower resource spend"],
 "revenue-growth":["Incremental revenue","Higher conversion","Improved retention"],
 "customer-experience":["Higher satisfaction","Reduced churn","Lower service cost"],
 "personalization":["Higher engagement","Increased basket size","Improved loyalty"],
 "quality-improvement":["Lower defect cost","Reduced rework","Better outcomes"],
 "decision-support":["Faster decisions","Better forecasts","Reduced analyst effort"],
 "citizen-services":["Faster service","Higher satisfaction","Lower cost to serve"],
 "regulatory-reporting":["Lower compliance cost","Fewer exceptions","Reduced audit risk"],
 "risk-and-compliance":["Reduced risk exposure","Lower compliance cost","Better coverage"],
 "workforce-productivity":["Labour cost savings","Higher productivity","Reduced burnout"],
 "sustainability":["Energy cost savings","Lower emissions","Reduced waste"],
 "innovation":["Faster innovation","New capabilities","Competitive advantage"],
 "time-to-market":["Faster delivery","Lower production cost","Higher output"],
}

def slugify(s):
    return re.sub(r'[^a-z0-9]+','-', s.lower()).strip('-')

def build_all():
    records=[]
    seen=set()
    for ind, items in IND.items():
        for it in items:
            (title,cap,func,obj,value,cx,risk,ttv,mat,problem,solution)=it
            slug=f"{ind}-{slugify(title)}"
            capn=CAP_NAME.get(cap,cap.replace('-',' '))
            business_value=f"Delivers measurable {obj.replace('-',' ')} by applying {capn} to a high-value workflow, with clear KPIs and a defined path from pilot to scale."
            data_required="Relevant historical and operational data (structured and unstructured), domain reference content, and access controls aligned to data-governance policy."
            kpis=OBJ_KPI.get(obj, ["Adoption rate","Time saved (%)","Quality score"])
            roi=OBJ_ROI.get(obj, ["Efficiency gains","Cost savings","Better outcomes"])
            rec=dict(ind=ind,slug=slug,title=title,cap=cap,func=func,obj=obj,
                     value=value,cx=cx,risk=risk,ttv=ttv,mat=mat,
                     summary=f"{solution}",problem=problem,solution=solution,
                     business_value=business_value,data_required=data_required,
                     kpis=kpis,roi=roi)
            records.append(rec)
    return records

def qa(records):
    errors=[]
    slugs=[r['slug'] for r in records]
    dupes={s for s in slugs if slugs.count(s)>1}
    if dupes: errors.append(f"Duplicate slugs: {dupes}")
    for r in records:
        if r['cap'] not in CAPS: errors.append(f"{r['slug']}: bad capability {r['cap']}")
        if r['func'] not in FUNCS: errors.append(f"{r['slug']}: bad function {r['func']}")
        if r['obj'] not in OBJS: errors.append(f"{r['slug']}: bad objective {r['obj']}")
        if r['mat'] not in MATS: errors.append(f"{r['slug']}: bad maturity {r['mat']}")
        if r['value'] not in RATINGS: errors.append(f"{r['slug']}: bad value {r['value']}")
        if r['cx'] not in RATINGS: errors.append(f"{r['slug']}: bad complexity {r['cx']}")
        if r['risk'] not in RATINGS: errors.append(f"{r['slug']}: bad risk {r['risk']}")
        if r['ttv'] not in TTVS: errors.append(f"{r['slug']}: bad ttv {r['ttv']}")
        for fld in ('title','summary','problem','solution','business_value','data_required'):
            if not r[fld] or len(r[fld].strip())<5: errors.append(f"{r['slug']}: empty/short {fld}")
        if len(r['kpis'])<2: errors.append(f"{r['slug']}: too few kpis")
    # min 10 per industry
    from collections import Counter
    c=Counter(r['ind'] for r in records)
    for ind in IND:
        if c[ind]<10: errors.append(f"{ind}: only {c[ind]} use cases (<10)")
    return errors

if __name__=='__main__':
    recs=build_all()
    errs=qa(recs)
    print(f"Records: {len(recs)}")
    if errs:
        print("QA FAILED:")
        for e in errs: print("  -",e)
        sys.exit(1)
    print("QA PASSED: slug uniqueness, taxonomy relationships, required fields all valid.")
