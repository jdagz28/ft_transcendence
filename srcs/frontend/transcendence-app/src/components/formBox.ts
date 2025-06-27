export type TextField = {
  type: "text";
  label: string;
  name: string;
  placeholder?: string;
};

export type SelectField = {
  type: "select";
  label: string;
  name: string;
  options: string[];
};

export type FormField = TextField | SelectField;

export interface FormBoxSpec {
  heading: string;
  submitLabel: string;
  fields: FormField[];
}

export function buildFormBox(spec: FormBoxSpec): HTMLFormElement {
  const form = document.createElement("form");
  form.className =
    "w-full max-w-md mx-auto rounded-lg shadow-lg " +
    "bg-white dark:bg-gray-800 p-6 space-y-4";

  const h = document.createElement("h2");
  h.textContent = spec.heading;
  h.className = "text-xl font-semibold text-gray-900 dark:text-gray-100";
  form.appendChild(h);

  spec.fields.forEach((field) => {
    const wrap = document.createElement("div");
    wrap.className = "flex flex-col space-y-1";

    const label = document.createElement("label");
    label.textContent = field.label;
    label.htmlFor = field.name;
    label.className = "text-sm font-medium text-gray-700 dark:text-gray-300";
    wrap.appendChild(label);

    if (field.type === "text") {
      const input = document.createElement("input");
      input.type = "text";
      input.id = input.name = field.name;
      input.placeholder = field.placeholder ?? "";
      input.className =
        "border rounded px-3 py-2 focus:outline-none focus:ring-2 " +
        "focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 " +
        "dark:text-gray-100";
      wrap.appendChild(input);
    }

    if (field.type === "select") {
      const select = document.createElement("select");
      select.id = select.name = field.name;
      select.className =
        "border rounded px-3 py-2 focus:outline-none focus:ring-2 " +
        "focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 " +
        "dark:text-gray-100";
      field.options.forEach((opt) => {
        const o = document.createElement("option");
        o.value = o.textContent = opt;
        select.appendChild(o);
      });
      wrap.appendChild(select);
    }

    form.appendChild(wrap);
  });

  const btn = document.createElement("button");
  btn.type = "submit";
  btn.textContent = spec.submitLabel;
  btn.className =
    "w-full py-2 rounded bg-indigo-600 text-white font-semibold " +
    "hover:bg-indigo-700";
  form.appendChild(btn);

  return form;
}