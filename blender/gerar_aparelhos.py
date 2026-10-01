"""
Gera os modelos 3D do notebook e do celular da vitrine e exporta em .glb.

Como usar
  No Blender (4.2 ou mais recente): aba Scripting > Open > este arquivo > Run Script.
  Pelo terminal: blender -b -P blender/gerar_aparelhos.py

Saída: public/models/notebook.glb, celular.glb e suporte.glb
(ajuste PASTA_SAIDA abaixo se rodar o script de outro lugar).

Convenções que o site espera (src/main.js):
  - unidade da cena: 1 = 10 cm, aproximadamente
  - frente dos aparelhos voltada para -Y no Blender (vira +Z no three.js)
  - malha "screen" com UV ocupando 0..1, origem no centro da tela
  - notebook: Empty "LidPivot" no eixo da dobradiça; a tampa gira em X
  - origem de cada aparelho no centro da base, apoiado em Z = 0
  - suporte: Empty "PhoneSlot" marca a posição e a orientação do celular encaixado
"""
import bpy, bmesh, math, os
from mathutils import Vector

PASTA_SAIDA = ""  # deixe vazio para usar ../public/models relativo a este script

# ---------------------------------------------------------------- utilidades
def pasta_saida():
    if PASTA_SAIDA:
        return PASTA_SAIDA
    env = os.environ.get("OUT_DIR")
    if env:
        return env
    candidatos = []
    try:
        candidatos.append(os.path.dirname(os.path.abspath(__file__)))
    except NameError:
        pass
    # rodando pela aba Scripting, o caminho real fica no bloco de texto
    candidatos += [os.path.dirname(bpy.path.abspath(t.filepath)) for t in bpy.data.texts if t.filepath.endswith("gerar_aparelhos.py")]
    for base in candidatos:
        if base and os.path.isfile(os.path.join(base, "gerar_aparelhos.py")):
            return os.path.normpath(os.path.join(base, "..", "public", "models"))
    return bpy.path.abspath("//") or None

def limpar_cena():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves):
        for item in list(col):
            if item.users == 0:
                col.remove(item)

def material(nome, cor, metal=0.0, rugosidade=0.5, coat=0.0, emissao=None):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    m.use_nodes = True
    nos = m.node_tree.nodes
    # procura pelo tipo, não pelo nome: em português o nó se chama "BSDF Principiado"
    p = next((n for n in nos if n.type == "BSDF_PRINCIPLED"), None)
    if p is None:
        p = nos.new("ShaderNodeBsdfPrincipled")
        saida = next((n for n in nos if n.type == "OUTPUT_MATERIAL"), None) or nos.new("ShaderNodeOutputMaterial")
        m.node_tree.links.new(p.outputs[0], saida.inputs["Surface"])
    p.inputs["Base Color"].default_value = (*cor, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rugosidade
    if coat:
        p.inputs["Coat Weight"].default_value = coat
        p.inputs["Coat Roughness"].default_value = 0.03
    if emissao:
        p.inputs["Emission Color"].default_value = (*emissao, 1)
        p.inputs["Emission Strength"].default_value = 1.0
    return m

def jateado(m, escala=900.0, forca=0.025):
    """Microtextura de alumínio jateado (só no Blender; o glTF exporta os valores base)."""
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    if p.inputs["Normal"].is_linked:
        return m
    ruido = nt.nodes.new("ShaderNodeTexNoise")
    ruido.inputs["Scale"].default_value = escala
    ruido.inputs["Detail"].default_value = 2.0
    relevo = nt.nodes.new("ShaderNodeBump")
    relevo.inputs["Strength"].default_value = forca
    relevo.inputs["Distance"].default_value = 0.002
    nt.links.new(ruido.outputs["Fac"], relevo.inputs["Height"])
    nt.links.new(relevo.outputs["Normal"], p.inputs["Normal"])
    return m

def contorno_arredondado(w, d, r, seg=12):
    """Pontos (x, y) de um retângulo com cantos arredondados, sentido anti-horário."""
    r = min(r, w / 2 - 1e-4, d / 2 - 1e-4)
    pts = []
    cantos = [(w/2 - r, d/2 - r, 0), (-w/2 + r, d/2 - r, 90), (-w/2 + r, -d/2 + r, 180), (w/2 - r, -d/2 + r, 270)]
    for cx, cy, a0 in cantos:
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def placa(bm, w, d, h, r, centro=(0, 0, 0), seg=12):
    """Adiciona ao bmesh uma placa de cantos arredondados (planta XY, espessura em Z)."""
    cx, cy, cz = centro
    vs = [bm.verts.new((cx + x, cy + y, cz - h / 2)) for x, y in contorno_arredondado(w, d, r, seg)]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    novos = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=novos, vec=(0, 0, h))
    bmesh.ops.reverse_faces(bm, faces=[f])
    return f

def objeto_de_bmesh(nome, bm, mat=None, pai=None):
    me = bpy.data.meshes.new(nome)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(nome, me)
    bpy.context.collection.objects.link(ob)
    if mat:
        me.materials.append(mat)
    if pai:
        ob.parent = pai
    return ob

def chanfrar(ob, largura, segmentos=4, angulo=40, material_borda=None):
    """Chanfra as arestas vivas. material_borda: material das faces novas (borda polida)."""
    if material_borda is not None:
        ob.data.materials.append(material_borda)
    mod = ob.modifiers.new("Chanfro", "BEVEL")
    if material_borda is not None:
        mod.material = len(ob.data.materials) - 1
    mod.width = largura
    mod.segments = segmentos
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(angulo)
    mod.harden_normals = True
    aplicar_modificadores(ob)

def aplicar_modificadores(ob):
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)

def suavizar(ob, angulo=35):
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angulo))
    except Exception:
        bpy.ops.object.shade_smooth()
    ob.select_set(False)

def recortar(alvo, cortador):
    mod = alvo.modifiers.new("Recorte", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = cortador
    aplicar_modificadores(alvo)
    bpy.data.objects.remove(cortador, do_unlink=True)

def cortador_caixa(nome, tamanho, local):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=tamanho, verts=bm.verts)
    ob = objeto_de_bmesh(nome, bm)
    ob.location = local
    return ob

def tela_plana(nome, w, h, r, mat, pai, local, seg=10):
    """Retângulo arredondado no plano XZ, voltado para -Y, com UV 0..1 e origem no centro."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, 0, z)) for x, z in contorno_arredondado(w, h, r, seg)]
    f = bm.faces.new(vs)
    if f.normal.y > 0:
        bmesh.ops.reverse_faces(bm, faces=[f])
    bmesh.ops.triangulate(bm, faces=[f])
    uv = bm.loops.layers.uv.new("UVMap")
    for face in bm.faces:
        for loop in face.loops:
            co = loop.vert.co
            loop[uv].uv = ((co.x + w / 2) / w, (co.z + h / 2) / h)
    ob = objeto_de_bmesh(nome, bm, mat, pai)
    ob.location = local
    return ob

def vazio(nome, pai=None, local=(0, 0, 0)):
    e = bpy.data.objects.new(nome, None)
    e.empty_display_size = 0.2
    bpy.context.collection.objects.link(e)
    e.parent = pai
    e.location = local
    return e

# ---------------------------------------------------------------- materiais
def criar_materiais():
    M = {
        # alumínio anodizado cinza-espacial, jateado: reflexo suave e difuso, sem cara de cromo
        "alu": jateado(material("Aluminio", (0.2, 0.205, 0.215), metal=1.0, rugosidade=0.48)),
        # bordas chanfradas polidas (diamond cut): um pouco mais claras e brilhantes
        "alu_borda": material("AluminioBorda", (0.38, 0.39, 0.41), metal=1.0, rugosidade=0.16),
        "alu_escuro": jateado(material("AluminioEscuro", (0.24, 0.25, 0.27), metal=1.0, rugosidade=0.5)),
        "tecla": material("Tecla", (0.006, 0.006, 0.007), rugosidade=0.8),
        # vidro fosco do trackpad, no mesmo tom do chassi
        "trackpad": material("Trackpad", (0.17, 0.175, 0.185), metal=0.75, rugosidade=0.36),
        "vidro": material("VidroPreto", (0.004, 0.004, 0.005), rugosidade=0.04, coat=1.0),
        "tela": material("Tela", (0.0, 0.0, 0.0), rugosidade=0.2, emissao=(0.02, 0.025, 0.04)),
        "borracha": material("Borracha", (0.02, 0.02, 0.02), rugosidade=0.9),
        "porta": material("PortaInterna", (0.01, 0.01, 0.01), rugosidade=0.6),
        "titanio": jateado(material("Titanio", (0.30, 0.31, 0.33), metal=1.0, rugosidade=0.42), 700, 0.02),
        "lente": material("Lente", (0.002, 0.002, 0.003), rugosidade=0.02, coat=1.0),
        "grafite": jateado(material("AluminioGrafite", (0.22, 0.23, 0.25), metal=1.0, rugosidade=0.5)),
        "prata": material("PrataPolida", (0.85, 0.86, 0.88), metal=1.0, rugosidade=0.14),
    }
    p = next(n for n in M["tecla"].node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    p.inputs["Specular IOR Level"].default_value = 0.04   # plástico fosco: quase sem reflexo
    return M

# ---------------------------------------------------------------- notebook
NB_W, NB_D, NB_H = 3.0, 2.04, 0.11      # base
TAMPA_H, TAMPA_E = 1.96, 0.065          # altura e espessura da tampa
TELA_W, TELA_H = 2.74, 1.7125           # 16:10, igual ao canvas 1280x800

def linhas_teclado():
    return [
        ("fn", [1] * 14),
        ("n",  [1] * 13 + [1.5]),
        ("n",  [1.5] + [1] * 12 + [1]),
        ("n",  [1.8] + [1] * 11 + [1.7]),
        ("n",  [2.3] + [1] * 10 + [2.2]),
        ("n",  [1, 1, 1, 1.25, 5.5, 1.25, 1, 1, 1]),
    ]

def criar_notebook(M):
    raiz = vazio("Notebook")

    # base com cantos arredondados e bordas chanfradas
    bm = bmesh.new(); placa(bm, NB_W, NB_D, NB_H, 0.11, (0, 0, NB_H / 2))
    base = objeto_de_bmesh("Base", bm, M["alu"], raiz)
    chanfrar(base, 0.018, 5, material_borda=M["alu_borda"])

    # rebaixo do teclado, entalhe frontal e portas USB-C
    poco_y, poco_d = 0.30, 1.10
    recortar(base, cortador_caixa("c_poco", (2.70, poco_d, 0.02), (0, poco_y, NB_H)))
    recortar(base, cortador_caixa("c_entalhe", (0.55, 0.06, 0.04), (0, -NB_D / 2, NB_H)))
    for i in range(2):
        recortar(base, cortador_caixa(f"c_usb{i}", (0.1, 0.17, 0.035), (-NB_W / 2, 0.25 - i * 0.26, NB_H * 0.5)))
    base.data.materials.append(M["porta"])
    suavizar(base)

    # teclas: todas num único objeto
    bm = bmesh.new()
    gap, altura_tecla = 0.026, 0.012
    largura_util = 2.60
    y = poco_y + poco_d / 2 - 0.045
    for tipo, larguras in linhas_teclado():
        prof = 0.085 if tipo == "fn" else 0.162
        escala = (largura_util - gap * (len(larguras) - 1)) / sum(larguras)
        x = -largura_util / 2
        for u in larguras:
            w = u * escala
            placa(bm, w, prof, altura_tecla, 0.018, (x + w / 2, y - prof / 2, NB_H - 0.01 + altura_tecla / 2), seg=3)
            x += w + gap
        y -= prof + gap
    teclas = objeto_de_bmesh("Teclas", bm, M["tecla"], raiz)
    chanfrar(teclas, 0.004, 2, 30)
    suavizar(teclas)

    # trackpad
    bm = bmesh.new(); placa(bm, 1.10, 0.66, 0.006, 0.04, (0, -0.58, NB_H + 0.0005 - 0.003))
    tp = objeto_de_bmesh("Trackpad", bm, M["trackpad"], raiz)
    chanfrar(tp, 0.002, 2); suavizar(tp)

    # pés de borracha
    for i, (px, py) in enumerate([(-1.25, -0.8), (1.25, -0.8), (-1.25, 0.8), (1.25, 0.8)]):
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.09, radius2=0.08, depth=0.012)
        pe = objeto_de_bmesh(f"Pe{i}", bm, M["borracha"], raiz); pe.location = (px, py, -0.004); suavizar(pe)

    # dobradiça
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=0.045, radius2=0.045, depth=2.2)
    dob = objeto_de_bmesh("Dobradica", bm, M["alu_escuro"], raiz)
    dob.rotation_euler = (0, math.radians(90), 0); dob.location = (0, NB_D / 2 - 0.06, NB_H + 0.01)
    suavizar(dob)

    # tampa: o pivô fica no eixo da dobradiça; gire LidPivot em X para abrir e fechar
    pivo = vazio("LidPivot", raiz, (0, NB_D / 2 - 0.06, NB_H + TAMPA_E / 2 + 0.004))
    bm = bmesh.new(); placa(bm, NB_W, TAMPA_H, TAMPA_E, 0.11, (0, 0, 0))
    tampa = objeto_de_bmesh("Tampa", bm, M["alu"], pivo)
    tampa.rotation_euler = (math.radians(90), 0, 0); tampa.location = (0, 0, TAMPA_H / 2 - 0.02)
    chanfrar(tampa, 0.014, 5, material_borda=M["alu_borda"]); suavizar(tampa)

    frente = -TAMPA_E / 2 - 0.0006
    moldura = tela_plana("Moldura", NB_W - 0.06, TAMPA_H - 0.06, 0.09, M["vidro"], pivo, (0, frente, TAMPA_H / 2 - 0.02))
    tela = tela_plana("screen", TELA_W, TELA_H, 0.012, M["tela"], pivo, (0, frente - 0.0006, TAMPA_H / 2 - 0.02 + 0.03))
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=20, radius=0.012)
    cam = objeto_de_bmesh("WebCam", bm, M["lente"], pivo)
    cam.rotation_euler = (math.radians(90), 0, 0); cam.location = (0, frente - 0.0008, TAMPA_H - 0.02 - 0.06)

    # emblema discreto na traseira
    bm = bmesh.new(); placa(bm, 0.22, 0.22, 0.002, 0.05, (0, 0, 0), seg=6)
    emb = objeto_de_bmesh("Emblema", bm, M["alu_escuro"], pivo)
    emb.rotation_euler = (math.radians(90), math.radians(45), 0)  # gira no plano da tampa
    emb.location = (0, TAMPA_E / 2 + 0.0005, TAMPA_H / 2 + 0.05)
    return raiz

# ---------------------------------------------------------------- celular
CEL_W, CEL_H, CEL_E, CEL_R = 0.80, 1.66, 0.078, 0.13
CTELA_W, CTELA_H, CTELA_R = 0.74, 1.60, 0.10     # proporção do canvas 540x1168

def criar_celular(M):
    raiz = vazio("Celular")
    cz = CEL_H / 2

    # corpo: placa arredondada em pé (planta XZ), laterais bem arredondadas
    bm = bmesh.new(); placa(bm, CEL_W, CEL_H, CEL_E, CEL_R, (0, 0, 0), seg=16)
    corpo = objeto_de_bmesh("Corpo", bm, M["titanio"], raiz)
    corpo.rotation_euler = (math.radians(90), 0, 0); corpo.location = (0, 0, cz)
    chanfrar(corpo, 0.024, 6, 50); suavizar(corpo, 50)

    frente = -CEL_E / 2 - 0.0006
    tela_plana("VidroFrontal", CEL_W - 0.02, CEL_H - 0.02, CEL_R - 0.01, M["vidro"], raiz, (0, frente, cz))
    tela_plana("screen", CTELA_W, CTELA_H, CTELA_R, M["tela"], raiz, (0, frente - 0.0006, cz))

    # ilha da câmera frontal, alinhada com o desenho das telas (canvas 540x1168)
    ilha_w = 132 / 540 * CTELA_W
    ilha_h = 38 / 1168 * CTELA_H
    ilha_z = cz + CTELA_H / 2 - (24 + 19) / 1168 * CTELA_H
    tela_plana("Ilha", ilha_w, ilha_h, ilha_h / 2, M["lente"], raiz, (0, frente - 0.0012, ilha_z), seg=8)

    # botões laterais
    for nome, x, z, h in [("BotaoPower", CEL_W / 2, cz + 0.30, 0.22), ("Volume1", -CEL_W / 2, cz + 0.38, 0.14), ("Volume2", -CEL_W / 2, cz + 0.20, 0.14)]:
        bm = bmesh.new(); placa(bm, 0.03, h, 0.03, 0.012, (0, 0, 0), seg=4)
        b = objeto_de_bmesh(nome, bm, M["titanio"], raiz)
        b.rotation_euler = (math.radians(90), 0, 0); b.location = (x + (0.004 if x > 0 else -0.004), 0, z)
        suavizar(b)

    # módulo de câmeras traseiro
    bm = bmesh.new(); placa(bm, 0.30, 0.30, 0.014, 0.07, (0, 0, 0), seg=10)
    mod = objeto_de_bmesh("ModuloCamera", bm, M["vidro"], raiz)
    mod.rotation_euler = (math.radians(90), 0, 0)
    mx, mz = -CEL_W / 2 + 0.2, CEL_H - 0.2
    mod.location = (mx, CEL_E / 2 + 0.007, mz)
    chanfrar(mod, 0.004, 3); suavizar(mod)
    for i, (dx, dz) in enumerate([(-0.065, 0.065), (0.065, 0.0), (-0.065, -0.065)]):
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=0.05, radius2=0.044, depth=0.02)
        l = objeto_de_bmesh(f"Lente{i}", bm, M["lente"], raiz)
        l.rotation_euler = (math.radians(90), 0, 0); l.location = (mx + dx, CEL_E / 2 + 0.018, mz + dz); suavizar(l)
    return raiz

# ---------------------------------------------------------------- suporte dobrável do celular
SUP_W = 0.70                      # largura das placas
SUP_PHI = math.radians(18)        # inclinação da placa de apoio em relação à vertical
SUP_L = 1.05                      # comprimento da placa de apoio
SUP_TOPO = (0.40, 1.30)           # dobradiça de cima (y, z)
SUP_TRAS = (0.36, 0.08)           # dobradiça de trás, sobre a base (y, z)

def quadro(nome, pai, origem, angulo_x):
    """Empty que define um sistema local: +Y ao longo da placa, +Z para a frente da placa."""
    e = vazio(nome, pai, origem)
    e.rotation_euler = (angulo_x, 0, 0)
    return e

def dobradica(nome, pai, y, z, raio, M):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=40, radius1=raio, radius2=raio, depth=SUP_W - 0.04)
    d = objeto_de_bmesh(nome, bm, M["grafite"], pai)
    d.rotation_euler = (0, math.radians(90), 0); d.location = (0, y, z); suavizar(d)
    for lado in (-1, 1):
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=40, radius1=raio * 0.82, radius2=raio * 0.82, depth=0.014)
        t = objeto_de_bmesh(f"{nome}Tampa{'E' if lado < 0 else 'D'}", bm, M["prata"], pai)
        t.rotation_euler = (0, math.radians(90), 0); t.location = (lado * (SUP_W / 2 - 0.013), y, z); suavizar(t)

def criar_suporte(M):
    raiz = vazio("Suporte")

    # base com recorte frontal arredondado
    bm = bmesh.new(); placa(bm, SUP_W, 0.80, 0.045, 0.05, (0, 0, 0.0225))
    base = objeto_de_bmesh("SuporteBase", bm, M["grafite"], raiz)
    chanfrar(base, 0.008, 3)
    bm = bmesh.new(); placa(bm, 0.40, 0.09, 0.2, 0.04, (0, -0.30, 0.02))
    recortar(base, objeto_de_bmesh("c_furo", bm))
    suavizar(base)

    # braço traseiro: da dobradiça de trás até a de cima
    yb, zb = SUP_TRAS; yt, zt = SUP_TOPO
    comp = math.hypot(yt - yb, zt - zb); psi = math.atan2(yt - yb, zt - zb)
    braco_q = quadro("BracoQuadro", raiz, (0, yb, zb), math.radians(90) - psi)
    bm = bmesh.new(); placa(bm, SUP_W - 0.08, comp, 0.04, 0.02, (0, comp / 2, 0))
    braco = objeto_de_bmesh("Braco", bm, M["grafite"], braco_q); chanfrar(braco, 0.006, 3); suavizar(braco)
    for lado in (-1, 1):
        bm = bmesh.new(); placa(bm, 0.022, comp * 0.62, 0.004, 0.011, (lado * 0.25, comp * 0.5, 0.0205), seg=4)
        objeto_de_bmesh(f"Friso{'E' if lado < 0 else 'D'}", bm, M["porta"], braco_q)

    # placa de apoio: desce da dobradiça de cima até os ganchos
    u = (math.sin(SUP_PHI), math.cos(SUP_PHI))
    yB, zB = yt - u[0] * SUP_L, zt - u[1] * SUP_L
    placa_q = quadro("PlacaQuadro", raiz, (0, yB, zB), math.radians(90) - SUP_PHI)
    bm = bmesh.new(); placa(bm, SUP_W, SUP_L, 0.04, 0.03, (0, SUP_L / 2, 0))
    apoio = objeto_de_bmesh("PlacaApoio", bm, M["grafite"], placa_q)
    bm = bmesh.new(); placa(bm, 0.24, 0.30, 0.2, 0.05, (0, 0.06, 0))
    recortar(apoio, objeto_de_bmesh("c_vao", bm))          # vão central para o cabo
    chanfrar(apoio, 0.006, 3); suavizar(apoio)
    for lado in (-1, 1):
        x = lado * 0.235
        bm = bmesh.new()
        placa(bm, 0.21, 0.03, 0.12, 0.012, (x, 0.015, 0.075), seg=4)      # apoio horizontal
        placa(bm, 0.21, 0.05, 0.022, 0.01, (x, 0.05, 0.125), seg=4)       # aba que segura o celular
        g = objeto_de_bmesh(f"Gancho{'E' if lado < 0 else 'D'}", bm, M["grafite"], placa_q)
        chanfrar(g, 0.004, 2); suavizar(g)
    bm = bmesh.new(); placa(bm, 0.30, 0.07, 0.008, 0.035, (0, 0.72, 0.022), seg=8)
    objeto_de_bmesh("Borracha", bm, M["borracha"], placa_q)

    dobradica("DobradicaTras", raiz, yb, zb, 0.05, M)
    dobradica("DobradicaTopo", raiz, yt, zt, 0.055, M)

    # onde o celular encaixa: origem do celular (base, centro da espessura) e orientação
    slot = vazio("PhoneSlot", placa_q, (0, 0.03, 0.02 + CEL_E / 2 + 0.001))
    slot.rotation_euler = (math.radians(-90), 0, 0)
    return raiz

def encaixar_celular(cel, suporte):
    bpy.context.view_layer.update()
    slot = next(o for o in filhos(suporte) if o.name.startswith("PhoneSlot"))
    cel.matrix_world = slot.matrix_world.copy()

# ---------------------------------------------------------------- exportação
def filhos(ob):
    out = [ob]
    for c in ob.children:
        out += filhos(c)
    return out

def exportar(raiz, caminho):
    bpy.ops.object.select_all(action="DESELECT")
    for o in filhos(raiz):
        o.select_set(True)
    bpy.context.view_layer.objects.active = raiz
    opcoes = dict(filepath=caminho, export_format="GLB", use_selection=True, export_apply=True,
                  export_yup=True, export_materials="EXPORT")
    try:
        bpy.ops.export_scene.gltf(**opcoes, export_draco_mesh_compression_enable=True,
                                  export_draco_mesh_compression_level=6)
    except Exception as e:
        print("Draco indisponível, exportando sem compressão:", e)
        bpy.ops.export_scene.gltf(**opcoes)
    print("Exportado:", caminho, round(os.path.getsize(caminho) / 1024), "KB")

def main():
    limpar_cena()
    M = criar_materiais()
    nb = criar_notebook(M)
    cel = criar_celular(M)
    sup = criar_suporte(M)
    destino = pasta_saida()
    if destino:
        os.makedirs(destino, exist_ok=True)
        exportar(nb, os.path.join(destino, "notebook.glb"))
        exportar(cel, os.path.join(destino, "celular.glb"))
        exportar(sup, os.path.join(destino, "suporte.glb"))
    else:
        print("Pasta de saída não encontrada: preencha PASTA_SAIDA no topo do script para exportar os .glb.")
    # prévia: suporte ao lado do notebook, celular encaixado
    sup.location = (2.3, 0.45, 0)
    encaixar_celular(cel, sup)
    return nb, cel, sup

if __name__ == "__main__":
    main()
