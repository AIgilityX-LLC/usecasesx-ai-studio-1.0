import sys
sys.path.insert(0,'/tmp/seed')
from build import build_all, qa, IND

def esc(s): return s.replace("'","''")
def arr(lst): return "ARRAY[" + ",".join("'"+esc(x)+"'" for x in lst) + "]::text[]"
RANK={"Low":2,"Medium":3,"High":4,"Critical":5}
TTV_RANK={"Short":2,"Medium":3,"Long":4}

def emit(records, industries):
    recs=[r for r in records if r['ind'] in industries]
    out=[]
    for i,r in enumerate(recs):
        impact=RANK.get(r['value'],3)
        effort=RANK.get(r['cx'],3)
        rscore=RANK.get(r['risk'],3)
        out.append(f"""INSERT INTO use_cases (slug,title,summary,problem,solution,business_problem,ai_solution_concept,business_value,data_required,kpis,roi_areas,value_potential,complexity,risk_level,time_to_value,maturity,maturity_level,impact_score,effort_score,risk_score,status,visibility,content_status,published_at,display_order)
VALUES ('{esc(r['slug'])}','{esc(r['title'])}','{esc(r['summary'])}','{esc(r['problem'])}','{esc(r['solution'])}','{esc(r['problem'])}','{esc(r['solution'])}','{esc(r['business_value'])}','{esc(r['data_required'])}',{arr(r['kpis'])},{arr(r['roi'])},'{r['value']}','{r['cx']}','{r['risk']}','{r['ttv']}','{r['mat']}','{r['mat']}',{impact},{effort},{rscore},'published','both','published',now(),{i})
ON CONFLICT (slug) DO NOTHING;""")
        # junctions
        out.append(f"INSERT INTO use_case_industries(use_case_id,industry_id) SELECT u.id,i.id FROM use_cases u, industries i WHERE u.slug='{esc(r['slug'])}' AND i.slug='{r['ind']}' ON CONFLICT DO NOTHING;")
        out.append(f"INSERT INTO use_case_capabilities(use_case_id,capability_id) SELECT u.id,c.id FROM use_cases u, ai_capabilities c WHERE u.slug='{esc(r['slug'])}' AND c.slug='{r['cap']}' ON CONFLICT DO NOTHING;")
        out.append(f"INSERT INTO use_case_business_functions(use_case_id,business_function_id) SELECT u.id,f.id FROM use_cases u, business_functions f WHERE u.slug='{esc(r['slug'])}' AND f.slug='{r['func']}' ON CONFLICT DO NOTHING;")
        out.append(f"INSERT INTO use_case_business_objectives(use_case_id,objective_id) SELECT u.id,o.id FROM use_cases u, business_objectives o WHERE u.slug='{esc(r['slug'])}' AND o.slug='{r['obj']}' ON CONFLICT DO NOTHING;")
        # metrics (headline)
        for j,(label,val) in enumerate([(r['kpis'][0],"+"),(r['kpis'][1],"")]):
            out.append(f"INSERT INTO use_case_metrics(use_case_id,label,value,sort_order) SELECT u.id,'{esc(label)}','Target',{j} FROM use_cases u WHERE u.slug='{esc(r['slug'])}' ON CONFLICT DO NOTHING;")
    return "\n".join(out)

if __name__=='__main__':
    records=build_all()
    errs=qa(records)
    if errs:
        print("QA FAILED",errs); sys.exit(1)
    batches=[list(IND)[i:i+4] for i in range(0,len(IND),4)]
    for bi,b in enumerate(batches):
        sql=emit(records,b)
        with open(f"/tmp/seed/batch_{bi}.sql","w") as f: f.write(sql)
        print(f"batch_{bi}.sql: industries={b}")
