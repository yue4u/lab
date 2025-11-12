package main

import (
	"bytes"
	"fmt"
	"text/template"

	"go.bytecodealliance.org/cm"
	tpl "yue.cat/internal/iter-tpl/tpl/template"
)

type TplResult = cm.Result[string, string, string]

func init() {
	//	execute: func(tpl: string, array: list<string>) -> result<string>
	tpl.Exports.Execute = func(tpl string, array cm.List[string]) (result TplResult) {
		defer func() {
	        if r := recover(); r != nil {
	            fmt.Println("Recovered in f", r)
	        }
	    }()

		_tpl := ""
		for i, v := range array.Slice() {
			_tpl += fmt.Sprintf("{{ $%d := \"%s\" }}", i, v)
		}
		_tpl += tpl
		t, err := template.New("tpl").Parse(_tpl)
		if err != nil {
			return cm.Err[TplResult](err.Error())
		}
		var buf bytes.Buffer
		if err = t.Execute(&buf, array); err != nil {
			return cm.Err[TplResult](err.Error())
		}

		return cm.OK[TplResult](buf.String())
	}
}

// main is required for the `wasi` target, even if it isn't used.
func main() {}
