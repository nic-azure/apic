import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ReqFolder, TreeReqFolder } from 'src/app/models/ReqFolder.model';
import { ApiRequest } from 'src/app/models/Request.model';
import { RequestsService } from 'src/app/services/requests.service';
import { Toaster } from 'src/app/services/toaster.service';
import { Utils } from 'src/app/services/utils.service';
import { RequestsStateSelector } from 'src/app/state/requests.selector';
import { TesterTabsService } from '../tester-tabs/tester-tabs.service';

@Component({
  selector: 'app-save-req-dialog',
  templateUrl: './save-req-dialog.component.html',
  styleUrls: ['./save-req-dialog.component.css']
})
export class SaveReqDialogComponent implements OnInit {
  @Select(RequestsStateSelector.getFoldersTree) folders$: Observable<any[]>;
  form: FormGroup;
  selectedFolder: TreeReqFolder;
  title = 'Save Request';

  constructor(fb: FormBuilder,
    private toaster: Toaster,
    private store: Store,
    private tabsService: TesterTabsService,
    private dialogRef: MatDialogRef<SaveReqDialogComponent>,
    private reqService: RequestsService,
    @Inject(MAT_DIALOG_DATA) public data: { req: ApiRequest, saveAs?: boolean, duplicate?: boolean, parent?: string }) {
    this.form = fb.group({
      name: ['', [Validators.required, Validators.maxLength(70)]],
      description: ['', Validators.maxLength(255)],
      _parent: ['', Validators.required]
    });

    if (data.saveAs) this.title = 'Save as';
    else if (data.duplicate) {
      this.title = `Duplicate: ${data.req.name}`
      this.form.patchValue({ _parent: this.data.req._parent });
      this.store.select(RequestsStateSelector.getRequestsInFolder)
        .pipe(map(filterFn => filterFn(this.data.req._parent)))
        .subscribe((reqs) => {
          this.selectedFolder = {
            _id: data.req._parent,
            name: this.data.parent,
            children: [],
            requests: reqs
          }
        });
    }
  }

  ngOnInit(): void {
    this.form.patchValue({ name: this.data.req.name ? (this.data.req.name + ' copy') : Utils.urlToReqName(this.data.req.method, this.data.req.url) })
  }

  async onSubmit() {
    let details = this.form.value;
    if (!details.name) {
      this.toaster.error('Please enter a request name');
      return;
    }


    if (!details._parent) {
      this.toaster.error('Please select a parent folder');
      return;
    }

    if (this.selectedFolder.requests.find(r => r.name.toLowerCase() === details.name.toLocaleLowerCase())) {
      this.toaster.error('A request with the same name is already in the folder');
    } else {
      let reqs: ApiRequest[] = await this.reqService.createRequests([{ ...this.data.req, ...details }]);
      console.log('saved')
      this.dialogRef.close();
      if (this.data.saveAs) {
        this.toaster.success('A copy of the request saved.');
      } else {
        this.toaster.success('Request saved.');
        this.tabsService.updateTab(this.data.req._id, reqs[0]._id, reqs[0].name);
      }
    }

  }

  selectFolder(folder: TreeReqFolder) {
    this.selectedFolder = folder;
    setTimeout(() => {
      //timeout for ripple to show
      this.form.patchValue({ _parent: folder._id });
    }, 0);
  }
}
