import duckdb, json, csv, sys
con=duckdb.connect()
con.sql("create view p as select *, hash(employee_id) h, flatten(list_transform(proyectos, lambda pr: pr.tecnologias)) _pt, list_transform(proyectos, lambda pr: pr.cliente_sector) _ps, list_transform(skills, lambda s: s.skill) _sk from 'data/profiles.parquet'")
CLOUD="['AWS','Azure','Google Cloud','Kubernetes','Terraform','EKS','AKS','GKE','Docker']"
groups = [
 ("Una persona aleatoria por área (visión general)", None,
  "select * from (select *, row_number() over (partition by area order by h) rn from p) where rn=1"),
 ("Brief ciberseguridad: PASA filtros (En banca, ≥3 años, área Ciberseguridad)", 4,
  "select * from p where area='Ciberseguridad' and disponibilidad='En banca' and anios_experiencia>=3 and list_contains(_ps,'Sector Público') order by h"),
 ("Brief ciberseguridad: NO pasa, <3 años de experiencia aunque esté En banca", 2,
  "select * from p where area='Ciberseguridad' and disponibilidad='En banca' and anios_experiencia<3 order by h"),
 ("Brief ciberseguridad: NO pasa, Roll-off (no disponible inmediatamente)", 2,
  "select * from p where area='Ciberseguridad' and disponibilidad like 'Roll-off%' and anios_experiencia>=5 order by h"),
 ("Brief ciberseguridad: NO pasa, Asignado aunque sea Senior+", 2,
  "select * from p where area='Ciberseguridad' and disponibilidad='Asignado' and nivel_seniority in ('Senior','Lead','Principal') order by h"),
 ("Brief core banking cloud: perfil cloud con proyectos de banca, disponible", 4,
  f"select * from p where area='Cloud & Infraestructura' and disponibilidad<>'Asignado' and list_contains(_ps,'Banca y Finanzas') and len(list_intersect(_sk,{CLOUD}))>=2 order by h"),
 ("Brief core banking cloud: Functional Consultant (Banca) disponible", 2,
  "select * from p where rol='Functional Consultant (Banca)' and disponibilidad<>'Asignado' order by h"),
 ("TALENTO OCULTO: fuera de Cloud/banca por área y sector principal, pero con skills cloud y proyectos de banca", 4,
  f"select * from p where area not in ('Cloud & Infraestructura','Aplicaciones Empresariales','Consultoría de Negocio') and sector_principal<>'Banca y Finanzas' and disponibilidad<>'Asignado' and list_contains(_ps,'Banca y Finanzas') and len(list_intersect(_pt,{CLOUD}))>=2 order by h"),
 ("Brief asistente IA retail: perfil IA/ML con proyectos de retail", 3,
  "select * from p where rol in ('AI Engineer (GenAI/LLM)','Machine Learning Engineer','Data Scientist') and disponibilidad<>'Asignado' and list_contains(_ps,'Retail y Consumo') order by h"),
 ("Brief asistente IA retail: perfil IA/ML SIN experiencia retail (retail como deseable, no debe filtrar)", 2,
  "select * from p where rol in ('AI Engineer (GenAI/LLM)','Machine Learning Engineer') and disponibilidad<>'Asignado' and not list_contains(_ps,'Retail y Consumo') order by h"),
 ("RIESGO: skill con ≥3 años de uso pero nivel 1", 3,
  "select * from p where len(list_filter(skills, lambda s: s.nivel=1 and s.anios>=3))>0 and disponibilidad<>'Asignado' order by h"),
 ("RIESGO: skill con nivel 5 y menos de 1 año de uso", 2,
  "select * from p where len(list_filter(skills, lambda s: s.nivel=5 and s.anios<1))>0 and disponibilidad<>'Asignado' order by h"),
 ("RIESGO: skill declarada que no aparece en ningún proyecto ni puesto (solo autodeclarada)", 2,
  "select * from p where len(list_filter(_sk, lambda s: not list_contains(_pt,s) and not list_contains(flatten(list_transform(experiencia, lambda e: e.tecnologias)),s)))>=3 and disponibilidad<>'Asignado' order by h"),
]
drop = {"h","_pt","_ps","_sk","rn"}
seen=set(); out=[]
for reason, n, sql in groups:
    rel = con.sql(sql + (f" limit {n}" if n else ""))
    cols = rel.columns
    for row in rel.fetchall():
        d = {k:v for k,v in zip(cols,row) if k not in drop}
        if d["employee_id"] in seen: continue
        seen.add(d["employee_id"])
        out.append({"_por_que_en_muestra": reason, **d})
json.dump(out, open("data/sample/profiles_sample.json","w",encoding="utf-8"), ensure_ascii=False, indent=2, default=str)
# CSV plano para Excel
flat_cols=["employee_id","nombre_completo","pais","ciudad","area","rol","nivel_seniority","anios_experiencia","anios_en_ntt","sector_principal","disponibilidad","modalidad_trabajo","movilidad_internacional"]
with open("data/sample/profiles_sample.csv","w",encoding="utf-8-sig",newline="") as f:
    w=csv.writer(f); w.writerow(["_por_que_en_muestra"]+flat_cols+["skills (nivel/años)","proyectos (sector · año · tecnologías)","certificaciones","idiomas"])
    for d in out:
        w.writerow([d["_por_que_en_muestra"]]+[d[c] for c in flat_cols]+[
          "; ".join(f"{s['skill']} ({s['nivel']}/{s['anios']}a)" for s in d["skills"]),
          " | ".join(f"{p['nombre']} [{p['cliente_sector']} · {p['anio']} · {', '.join(p['tecnologias'])}]" for p in d["proyectos"]),
          "; ".join(c["nombre"] for c in d["certificaciones"]),
          "; ".join(f"{i['idioma']} {i['nivel']}" for i in d["idiomas"])])
# Vocabularios
def rows(s): return con.sql(s).fetchall()
vocab = {
 "disponibilidad": [r[0] for r in rows("select disponibilidad from p group by 1 order by count(*) desc")],
 "nivel_seniority": ["Trainee","Junior","Mid","Senior","Lead","Principal"],
 "modalidad_trabajo": [r[0] for r in rows("select modalidad_trabajo from p group by 1 order by count(*) desc")],
 "sectores": [r[0] for r in rows("select sector_principal from p group by 1 order by count(*) desc")],
 "areas_y_roles": {a: [r[0] for r in rows(f"select rol from p where area='{a}' group by 1 order by count(*) desc")] for (a,) in rows("select area from p group by 1 order by count(*) desc")},
 "skills": [{"skill":s,"perfiles":n,"area_principal":a} for s,n,a in rows("select s.skill, count(*) n, mode(area) from (select area, unnest(skills) s from p) group by 1 order by 2 desc")],
 "certificaciones": [{"nombre":c,"perfiles":n} for c,n in rows("select c.nombre, count(*) from (select unnest(certificaciones) c from p) group by 1 order by 2 desc")],
 "metodologias": [r[0] for r in rows("select m from (select unnest(metodologias) m from p) group by 1 order by count(*) desc")],
 "habilidades_blandas": [r[0] for r in rows("select m from (select unnest(habilidades_blandas) m from p) group by 1 order by count(*) desc")],
 "idiomas": [r[0] for r in rows("select i.idioma from (select unnest(idiomas) i from p) group by 1 order by count(*) desc")],
 "niveles_idioma": ["A2","B1","B2","C1","C2","Nativo"],
}
json.dump(vocab, open("data/sample/vocabulario.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
from collections import Counter
print(len(out), "perfiles")
print(len(vocab["skills"]), "skills;", len(vocab["certificaciones"]), "certs")
